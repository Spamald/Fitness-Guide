import json
import os
from pathlib import Path

from flask import Flask, Response, jsonify, render_template, request
from groq import APIError, AuthenticationError, Groq

PARAMETER_NAMES = (
    "current_weight",
    "desired_weight",
    "height",
    "age",
    "target_timeframe",
    "activity_level_and_exercise_experience",
    "primary_goals",
    "health_conditions_injuries_limitations_or_none_disclosed",
    "allergies_intolerances_religious_requirements_or_none_disclosed",
    "food_likes_dislikes_and_eating_habits",
    "gym_or_home_equipment_days_available_and_minutes_per_session",
    "schedule_budget_sleep_cooking_ability_and_other_constraints",
)

# Paste your Groq API key here, or leave blank and set GROQ_API_KEY in the environment.
HARDCODED_GROQ_API_KEY = "insert your Groq API key here"


def create_app() -> Flask:
    app = Flask(__name__)
    prompt_template = Path(__file__).with_name("prompt_template.txt").read_text(
        encoding="utf-8"
    )

    @app.get("/")
    def index() -> str:
        return render_template("index.html")

    @app.post("/generate")
    def generate_fitness_guide() -> Response | tuple[Response, int]:
        if not request.is_json:
            return jsonify(error="Content-Type must be application/json."), 415

        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify(error="Request body must be a JSON object."), 400

        missing = [name for name in PARAMETER_NAMES if name not in payload]
        unexpected = [name for name in payload if name not in PARAMETER_NAMES]
        invalid = [
            name
            for name in PARAMETER_NAMES
            if name in payload
            and (not isinstance(payload[name], str) or not payload[name].strip())
        ]
        if missing or unexpected or invalid:
            return (
                jsonify(
                    error="Request must contain exactly the 12 named, non-empty string parameters.",
                    missing=missing,
                    unexpected=unexpected,
                    invalid=invalid,
                ),
                400,
            )

        api_key = HARDCODED_GROQ_API_KEY or os.environ.get("GROQ_API_KEY")
        if not api_key:
            return (
                jsonify(
                    error=(
                        "Set HARDCODED_GROQ_API_KEY in fitness_guide_server.py "
                        "or provide the GROQ_API_KEY environment variable."
                    )
                ),
                503,
            )

        prompt = prompt_template
        for name in PARAMETER_NAMES:
            prompt = prompt.replace("{" + name + "}", payload[name].strip())

        try:
            completion = Groq(api_key=api_key).chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[{"role": "user", "content": prompt}],
                temperature=1,
                max_completion_tokens=65535,
                top_p=1,
                reasoning_effort="medium",
            )
        except AuthenticationError:
            app.logger.exception("Groq rejected the configured API key.")
            return (
                jsonify(
                    error=(
                        "Groq rejected the configured API key. Check "
                        "HARDCODED_GROQ_API_KEY or GROQ_API_KEY and restart Flask."
                    )
                ),
                503,
            )
        except APIError:
            app.logger.exception("Groq failed to generate the fitness guide.")
            return jsonify(error="Fitness guide generation failed."), 502

        content = completion.choices[0].message.content
        if not isinstance(content, str):
            app.logger.error("Groq returned an empty fitness guide response.")
            return jsonify(error="The model returned an invalid fitness guide."), 502

        try:
            guide = json.loads(content)
        except json.JSONDecodeError:
            app.logger.error("Groq returned invalid JSON for the fitness guide.")
            return jsonify(error="The model returned invalid JSON."), 502

        if not isinstance(guide, dict):
            app.logger.error("Groq returned a JSON value that was not an object.")
            return jsonify(error="The model response must be a JSON object."), 502

        return jsonify(guide)

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)

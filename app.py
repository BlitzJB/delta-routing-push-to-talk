from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from groq import Groq
import tempfile
import json

app = Flask(__name__)
CORS(app)

client = Groq(api_key="your api key here")

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400

    audio_file = request.files['audio']
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.m4a') as temp_file:
        audio_file.save(temp_file.name)
        temp_filename = temp_file.name

    try:
        with open(temp_filename, "rb") as file:
            transcription = client.audio.transcriptions.create(
                file=(temp_filename, file.read()),
                model="whisper-large-v3",
                prompt="you are transcribing voice recording spoken in casual tamil",
                temperature=0.41,
                language="ta"
            )
        
        os.unlink(temp_filename)
        
        # Pass the transcription through the generation prompt
        completion = client.chat.completions.create(
            model="llama-3.1-70b-versatile",
            messages=[
                {
                    "role": "user",
                    "content": f"You are a Tamil hospital scheduler helping ambulances be routed to the appropriate hospital based on the callout that is given by the paramedics from the spot of pickup of the patient. \n\nyou will have to decode two types of information. first you will decode URGNENCY which is a number 1 - 10, URGENCY_REASONING which is a few words on why the case is urgent and finally all the facilities that would be needed in a hospital for example not bounded by, ICUs, MRI machines, etc.\n\nYour response should be in english only and in json format. three keys will be: URGENCY, URGENCY_REASONING: string, and REQUIRED_FACILITIES: string[]\n\nHere is the callout by the paramedic:\n{transcription.text}"
                }
            ],
            temperature=1,
            max_tokens=1024,
            top_p=1,
            stream=False,
            response_format={"type": "json_object"},
            stop=None,
        )
        
        # Parse the JSON response
        response_json = json.loads(completion.choices[0].message.content)
        
        return jsonify(response_json)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
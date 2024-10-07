let mediaRecorder;
let audioChunks = [];

const recordButton = document.getElementById('recordButton');
const transcriptionDiv = document.getElementById('transcription');
const demoButton = document.getElementById('demoButton');
const videoModal = document.getElementById('videoModal');
const closeModal = document.getElementById('closeModal');
const demoVideo = document.getElementById('demoVideo');

recordButton.addEventListener('mousedown', startRecording);
recordButton.addEventListener('mouseup', stopRecording);
recordButton.addEventListener('mouseleave', stopRecording);

// Demo video modal functionality
demoButton.addEventListener('click', () => {
    videoModal.classList.remove('hidden');
    videoModal.classList.add('flex');
    demoVideo.play();
});

closeModal.addEventListener('click', () => {
    videoModal.classList.add('hidden');
    videoModal.classList.remove('flex');
    demoVideo.pause();
    demoVideo.currentTime = 0;
});

videoModal.addEventListener('click', (e) => {
    if (e.target === videoModal) {
        videoModal.classList.add('hidden');
        videoModal.classList.remove('flex');
        demoVideo.pause();
        demoVideo.currentTime = 0;
    }
});

async function startRecording() {
    audioChunks = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
    };

    mediaRecorder.start();
    recordButton.classList.remove('bg-red-500', 'hover:bg-red-600');
    recordButton.classList.add('bg-green-500', 'hover:bg-green-600');
    recordButton.textContent = 'Recording...';
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        mediaRecorder.onstop = sendAudioToServer;
        recordButton.classList.remove('bg-green-500', 'hover:bg-green-600');
        recordButton.classList.add('bg-red-500', 'hover:bg-red-600');
        recordButton.textContent = 'Push to Talk';
    }
}

function sendAudioToServer() {
    const audioBlob = new Blob(audioChunks, { type: 'audio/m4a' });
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.m4a');

    transcriptionDiv.innerHTML = '<p class="text-gray-600">Processing audio...</p>';

    fetch('http://localhost:5000/transcribe', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.URGENCY) {
            const urgencyColor = data.URGENCY > 7 ? 'text-red-600' : (data.URGENCY > 4 ? 'text-yellow-600' : 'text-green-600');
            const resultHTML = `
                <h2 class="text-2xl font-bold mb-4">Analysis Results:</h2>
                <div class="bg-gray-100 p-4 rounded-lg">
                    <p class="mb-2"><span class="font-semibold">Urgency:</span> <span class="${urgencyColor} font-bold">${data.URGENCY}/10</span></p>
                    <p class="mb-2"><span class="font-semibold">Urgency Reasoning:</span> ${data.URGENCY_REASONING}</p>
                    <p class="font-semibold mb-2">Required Facilities:</p>
                    <ul class="list-disc list-inside pl-4">
                        ${data.REQUIRED_FACILITIES.map(facility => `<li>${facility}</li>`).join('')}
                    </ul>
                </div>
            `;
            transcriptionDiv.innerHTML = resultHTML;
        } else {
            transcriptionDiv.innerHTML = '<p class="text-red-600">Error: ' + JSON.stringify(data.error) + '</p>';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        transcriptionDiv.innerHTML = '<p class="text-red-600">An error occurred while processing the audio.</p>';
    });
}
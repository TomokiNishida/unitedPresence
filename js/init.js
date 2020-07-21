function startVideo() {
	navigator.mediaDevices.getUserMedia({video: true, audio: false})
	.then(function (stream) { // success
		document.getElementById('video').srcObject = stream;
	}).catch(function (error) { // error
		console.error('mediaDevice.getUserMedia() error:', error);
		return;
	});
}

const initmodel = async() => {
    await faceapi.nets.tinyFaceDetector.load("models/");
	await faceapi.nets.faceLandmark68Net.load("models/");
}
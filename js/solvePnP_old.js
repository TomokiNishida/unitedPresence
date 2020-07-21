function solve({nose_arr,leftEye_arr,rightEye_arr,jaw_arr,leftMouth_arr,rightMouth_arr,leftOutline_arr,rightOutline_arr,}) {
    const rows = detectPoints.length / 3;
    const modelPoints = cv.matFromArray(rows, 3, cv.CV_64FC1, detectPoints);

    // camera matrix
    const size = {
      width: 640,
      height: 480,
    };
    const center = [size.width / 2, size.height / 2];
    const cameraMatrix = cv.matFromArray(3, 3, cv.CV_64FC1, [
      ...[size.width, 0, center[0]],
      ...[0, size.width, center[1]],
      ...[0, 0, 1],
    ]);

    // image matrix
    const imagePoints = cv.Mat.zeros(rows, 2, cv.CV_64FC1);
    const distCoeffs = cv.Mat.zeros(4, 1, cv.CV_64FC1);
    const rvec = new cv.Mat({ width: 1, height: 3 }, cv.CV_64FC1);
    const tvec = new cv.Mat({ width: 1, height: 3 }, cv.CV_64FC1);
    
    [ ...nose_arr,
      ...jaw_arr,
      ...leftEye_arr,
      ...rightEye_arr,
      ...leftMouth_arr,
      ...rightMouth_arr,
      ...leftOutline_arr,
      ...rightOutline_arr,
    ].map((v, i) => {
      imagePoints.data64F[i] = v;
    });

    // 移動ベクトルと回転ベクトルの初期値を与えることで推測速度の向上をはかる
    tvec.data64F[0] = -100;
    tvec.data64F[1] = 100;
    tvec.data64F[2] = 1000;
    const distToLeftEyeX = Math.abs(leftEye_arr[0] - nose_arr[0]);
    const distToRightEyeX = Math.abs(rightEye_arr[0] - nose_arr[0]);
    if (distToLeftEyeX < distToRightEyeX) {
      // 左向き
      rvec.data64F[0] = -1.0;
      rvec.data64F[1] = -0.75;
      rvec.data64F[2] = -3.0;
    } else {
      // 右向き
      rvec.data64F[0] = 1.0;
      rvec.data64F[1] = -0.75;
      rvec.data64F[2] = -3.0;
    }

    const success = cv.solvePnP(
      modelPoints,
      imagePoints,
      cameraMatrix,
      distCoeffs,
      rvec,
      tvec,
      true
    );

    return {
      success,
      imagePoints,
      cameraMatrix,
      distCoeffs,
      rvec, // 回転ベクトル
      tvec, // 移動ベクトル
    };
}


function headpose({ rvec, tvec, cameraMatrix, distCoeffs, imagePoints }) {
    const noseEndPoint2DZ = new cv.Mat();
    const noseEndPoint2DY = new cv.Mat();
    const noseEndPoint2DX = new cv.Mat();

    const pointZ = cv.matFromArray(1, 3, cv.CV_64FC1, [0.0, 0.0, 500.0]);
    const pointY = cv.matFromArray(1, 3, cv.CV_64FC1, [0.0, 500.0, 0.0]);
    const pointX = cv.matFromArray(1, 3, cv.CV_64FC1, [500.0, 0.0, 0.0]);
    const jaco = new cv.Mat();

    cv.projectPoints(
      pointZ,
      rvec,
      tvec,
      cameraMatrix,
      distCoeffs,
      noseEndPoint2DZ,
      jaco
    );
    cv.projectPoints(
      pointY,
      rvec,
      tvec,
      cameraMatrix,
      distCoeffs,
      noseEndPoint2DY,
      jaco
    );
    cv.projectPoints(
      pointX,
      rvec,
      tvec,
      cameraMatrix,
      distCoeffs,
      noseEndPoint2DX,
      jaco
    );

    const canvas2 = document.getElementById('facedirection');
    const context = canvas2.getContext('2d');

    const position = {
      nose: {
        x: imagePoints.data64F[0],
        y: imagePoints.data64F[1],
      },
      x: {
        x: noseEndPoint2DX.data64F[0],
        y: noseEndPoint2DX.data64F[1],
      },
      y: {
        x: noseEndPoint2DY.data64F[0],
        y: noseEndPoint2DY.data64F[1],
      },
      z: {
        x: noseEndPoint2DZ.data64F[0],
        y: noseEndPoint2DZ.data64F[1],
      },
    };

    context.clearRect(0, 0, canvas2.width, canvas2.height);

    context.beginPath();
    context.lineWidth = 2;
    context.strokeStyle = 'rgb(255, 0, 0)';
    context.moveTo(position.nose.x, position.nose.y);
    context.lineTo(position.z.x, position.z.y);
    context.stroke();
    context.closePath();

    context.beginPath();
    context.lineWidth = 2;
    context.strokeStyle = 'rgb(0, 0, 255)';
    context.moveTo(position.nose.x, position.nose.y);
    context.lineTo(position.x.x, position.x.y);
    context.stroke();
    context.closePath();

    context.beginPath();
    context.lineWidth = 2;
    context.strokeStyle = 'rgb(0, 255, 0)';
    context.moveTo(position.nose.x, position.nose.y);
    context.lineTo(position.y.x, position.y.y);
    context.stroke();
    context.closePath();

    const rmat = new cv.Mat();
    cv.Rodrigues(rvec, rmat);

    const projectMat = cv.Mat.zeros(3, 4, cv.CV_64FC1);
    projectMat.data64F[0] = rmat.data64F[0];
    projectMat.data64F[1] = rmat.data64F[1];
    projectMat.data64F[2] = rmat.data64F[2];
    projectMat.data64F[4] = rmat.data64F[3];
    projectMat.data64F[5] = rmat.data64F[4];
    projectMat.data64F[6] = rmat.data64F[5];
    projectMat.data64F[8] = rmat.data64F[6];
    projectMat.data64F[9] = rmat.data64F[7];
    projectMat.data64F[10] = rmat.data64F[8];

    const cmat = new cv.Mat();
    const rotmat = new cv.Mat();
    const travec = new cv.Mat();
    const rotmatX = new cv.Mat();
    const rotmatY = new cv.Mat();
    const rotmatZ = new cv.Mat();
    const eulerAngles = new cv.Mat();

    cv.decomposeProjectionMatrix(
      projectMat,
      cmat,
      rotmat,
      travec,
      rotmatX,
      rotmatY,
      rotmatZ,
      eulerAngles // 顔の角度情報
    );

    return {
      yaw: eulerAngles.data64F[1],
      pitch: eulerAngles.data64F[0],
      roll: eulerAngles.data64F[2],
    };
}
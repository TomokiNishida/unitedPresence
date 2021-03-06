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

    const rnorm = Math.sqrt(rvec.data64F[0] ** 2 + rvec.data64F[1] ** 2 + rvec.data64F[2] ** 2);
    const rx = rvec.data64F[0] / rnorm;
    const ry = rvec.data64F[1] / rnorm;
    const rz = rvec.data64F[2] / rnorm;
    const rsin = Math.sin(rnorm);
    const rcos = Math.cos(rnorm);

    const r11 = rcos + (1-rcos)*rx*rx;
    const r12 = - rsin*rz + (1-rcos)*rx*ry;
    const r13 = rsin*ry + (1-rcos)*rx*rz;
    const r21 = rsin*rz + (1-rcos)*rx*ry;
    const r22 = rcos + (1-rcos)*ry*ry;
    const r23 = - rsin*rx + (1-rcos)*ry*rz;
    const r31 = - rsin*ry + (1-rcos)*rx*rz;
    const r32 = rsin*rx + (1-rcos)*ry*rz;
    const r33 = rcos + (1-rcos)*rz*rz;

    const rmat = cv.matFromArray(3, 3, cv.CV_64FC1, [r11,r12,r13,r21,r22,r23,r31,r32,r33]);

    const pitch = Math.asin(- r31);
    const pcos = Math.cos(pitch);
    const roll = Math.asin(r21/pcos);
    const yaw = Math.asin(r32/pcos);

    return {yaw,pitch,roll};
}
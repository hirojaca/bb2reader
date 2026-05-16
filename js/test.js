const startScanner = () => {
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#photo-area'),
            constraints: {
                width: 640,
                height: 480,
                facingMode: "environment" // 背面カメラ
            },
        },
        // Quaggaの誤認識防止などの独自設定は init の直下に書くのが一般的（一旦無しで動かすのが確実です）
        locate: true, 
        decoder: {
            readers: [
                "i2of5_reader" // ITfコード
            ]
        },

    }, function (err) {
        if (err) {
            console.log(err);
            return;
        }

        console.log("Initialization finished. Ready to start");
        Quagga.start();

}, function (err) {
        if (err) {
            console.log(err);
            return;
        }

        console.log("Initialization finished. Ready to start");
        Quagga.start();
        _scannerIsRunning = true;

        // ★ここにチェック用コードを追加
        setTimeout(() => {
            const video = document.querySelector('#photo-area video');
            if (video) {
                console.log("Video tag found!", video.srcObject);
                console.log("Video dimensions:", video.videoWidth, "x", video.videoHeight);
                
                // もし動画が一時停止状態なら強制再生を試みる
                if (video.paused) {
                    console.log("Video is paused. Trying to play forcedly...");
                    video.play().catch(e => console.log("Force play failed:", e));
                }
            } else {
                console.log("Video tag NOT found inside #photo-area");
            }
        }, 1000); // 起動1秒後にチェック
    });
        
        // 未定義エラーを防ぐためグローバル宣言か、事前に let _scannerIsRunning; を定義してください
        _scannerIsRunning = true; 
    });

    // --- 以降の Quagga.onProcessed と onDetected はそのままで大丈夫です ---
    Quagga.onProcessed(function (result) {
        var drawingCtx = Quagga.canvas.ctx.overlay,
            drawingCanvas = Quagga.canvas.dom.overlay;

        if (result) {
            if (result.boxes) {
                drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width")), parseInt(drawingCanvas.getAttribute("height")));
                result.boxes.filter(function (box) {
                    return box !== result.box;
                }).forEach(function (box) {
                    Quagga.ImageDebug.drawPath(box, {
                        x: 0,
                        y: 1
                    }, drawingCtx, {
                        color: "green",
                        lineWidth: 2
                    });
                });
            }

            if (result.box) {
                Quagga.ImageDebug.drawPath(result.box, {
                    x: 0,
                    y: 1
                }, drawingCtx, {
                    color: "#00F",
                    lineWidth: 2
                });
            }

            if (result.codeResult && result.codeResult.code) {
                Quagga.ImageDebug.drawPath(result.line, {
                    x: 'x',
                    y: 'y'
                }, drawingCtx, {
                    color: 'red',
                    lineWidth: 3
                });
            }
        }
    });

    Quagga.onDetected(function (result) {
        console.log(result.codeResult.code);
    });
}

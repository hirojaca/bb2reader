let _scannerIsRunning = false; // エラー回避のため事前に定義

$(function () {
    startScanner();
});

const startScanner = () => {
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#photo-area'),
            constraints: {
                // フルHD（1920x1080）に近い高解像度を要求する
                width: { min: 1024, ideal: 1920 },
                height: { min: 768, ideal: 1080 },
                facingMode: "environment"
            },
        },
        locate: true, 
        // ★ここに1行追記（decoderの直上あたりに置くのが一般的です）
        tryVertical: true,
        decoder: {
            readers: [
                "ean_reader",      /* 標準の13桁JANコード用 */
                "ean_8_reader"     /* 短縮型の8桁JANコード用（一応入れておくと安心です） */
            ]
        },
    }, function (err) {
        if (err) {
            console.log("Quagga Init Error:", err);
            return;
        }

        console.log("Initialization finished. Ready to start");
        Quagga.start();
        _scannerIsRunning = true;

        // ★実機でカメラ映像が止まる問題を追跡するための検証コード
        setTimeout(() => {
            const video = document.querySelector('#photo-area video');
            if (video) {
                console.log("【検証】videoタグを発見:", video.srcObject);
                console.log("【検証】カメラ解像度:", video.videoWidth, "x", video.videoHeight);
                
                // もし動画が一時停止状態なら強制再生を試みる
                if (video.paused) {
                    console.log("【検証】動画が一時停止しています。強制再生を試みます...");
                    video.play()
                        .then(() => console.log("【検証】強制再生に成功しました！"))
                        .catch(e => console.log("【検証】強制再生に失敗:", e));
                } else {
                    console.log("【検証】動画は再生状態になっています。");
                }
            } else {
                console.log("【検証】#photo-area の中にvideoタグが見つかりません。");
            }
        }, 1000); // 起動1秒後に実行
    });

    // 描画処理（緑枠などの表示）
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

    // バーコードを検出したときの処理（ここを書き換え）
    Quagga.onDetected(function (result) {
        // 1. 念のため今まで通りコンソールにも出す
        console.log("読み取り成功:", result.codeResult.code);

        // 2. ★ここに追記：HTMLの #result-text の中身を書き換える
        $('#result-text').text(result.codeResult.code);
    });
}

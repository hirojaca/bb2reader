let _scannerIsRunning = false; // スキャン中かどうかのフラグ
let _lastResultCode = null;    // 直前に読み取ったコードを記憶する変数
let _matchCount = 0;           // 同じコードが連続して一致した回数

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
                width: { min: 1024, ideal: 1920 },
                height: { min: 768, ideal: 1080 },
                facingMode: "environment" // 背面カメラ
            },
        },
        locate: true, 
        tryVertical: true, // 縦向きのバーコードにも対応
        decoder: {
            readers: [
                "ean_reader",   /* 標準の13桁JANコード用 */
                "ean_8_reader"  /* 短縮型の8桁JANコード用 */
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

    // バーコードを検出したときの処理
    Quagga.onDetected(function (result) {
        if (!_scannerIsRunning) return; 

        const currentCode = result.codeResult.code;

        // 誤読防止ロジック：直前に読んだ数字と同じかどうかを検証
        if (currentCode === _lastResultCode) {
            _matchCount++; 
        } else {
            _lastResultCode = currentCode; 
            _matchCount = 1;               
        }

        // 【確定判定】30回連続で同じ数字が一致したら処理をコミットする
        if (_matchCount >= 30) {
            _scannerIsRunning = false; 
            Quagga.stop(); // スキャン停止

            // 確定した数値を画面にパッと表示
            $('#result-text').text(currentCode);
            console.log("確定コード:", currentCode);
            
            // カウンターの初期化
            _lastResultCode = null;
            _matchCount = 0;
        }
    });
}

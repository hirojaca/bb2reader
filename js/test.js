let _scannerIsRunning = false; // スキャン中かどうかのフラグ
let _lastResultCode = null;    // 直前に読み取ったコードを記憶する変数
let _matchCount = 0;           // 同じコードが連続して一致した回数

$(function () {
    startScanner();
});

const startScanner = () => {
    // ページを開いた直後は「スキャン中」状態にする
    updateStatus("スキャン中...");

Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#photo-area'),
            constraints: {
                width: { min: 1024, ideal: 1920 },
                height: { min: 768, ideal: 1080 },
                facingMode: "environment", // 背面カメラ
                
                // ★【最重要】これを追記：1秒間に何回バーコードをガチ解析するか（15〜20回を推奨）
                // これを入れることで、同じコードでも「毎フレーム全力で再読み込み」させます
                decodeBarCodeRate: 15 
            },
        },
        locate: true, 
        tryVertical: true,
        
        // ★これを追記：同じコードを何回も連続でイベント発生させることを許可するおまじない
        // これが抜けていると、同じ数字のときに onDetected がフリーズします
        codeRepetition: true, 
        
        decoder: {
            readers: [
                "ean_reader",
                "ean_8_reader"
            ]
        },
    }, function (err) {
        if (err) {
            console.log("Quagga Init Error:", err);
            updateStatus("エラーが発生しました");
            return;
        }

        console.log("Initialization finished. Ready to start");
        Quagga.start();
        _scannerIsRunning = true;

        // 実機でカメラ映像が止まる問題を追跡するための検証コード
        setTimeout(() => {
            const video = document.querySelector('#photo-area video');
            if (video) {
                console.log("【検証】videoタグを発見:", video.srcObject);
                console.log("【検証】カメラ解像度:", video.videoWidth, "x", video.videoHeight);
                
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
        }, 1000);
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

    // バーコードを検出したときの処理（ここで3回連続一致をチェック）
    Quagga.onDetected(function (result) {
        // すでに確定してカメラが停止している場合は、以降の処理をスルー
        if (!_scannerIsRunning) return; 

        const currentCode = result.codeResult.code;

        // 誤読防止ロジック：直前に読んだ数字と同じかどうか
        if (currentCode === _lastResultCode) {
            _matchCount++; // 一致したらカウントアップ
        } else {
            _lastResultCode = currentCode; // 違うコードなら新しく記憶
            _matchCount = 1;               // カウントを1にリセット
        }

        // 3回連続で同じ数字が読めたら「確定判定」にする
        if (_matchCount >= 30) {
            _scannerIsRunning = false; // フラグをOFF
            updateStatus("確定！");      // 状態を「確定！」に更新
            Quagga.stop();             // カメラを停止させて映像を静止させる

            // HTML側の表示を書き換える
            $('#result-text').text(currentCode);
            console.log("確定コード（信頼性高）:", currentCode);
            
            // 次回スキャン（再開用）のためにカウンターをクリア
            _lastResultCode = null;
            _matchCount = 0;
        } else {
            // カウントが3に達していない間は検証中としてスキャンを継続
            updateStatus(`読み取り検証中... (${_matchCount}/3)`);
        }
    });
}

// 画面のステータス表示（#status-text）を書き換える共通関数
const updateStatus = (message) => {
    $('#status-text').text(message);
};

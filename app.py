from flask import Flask, render_template, request, jsonify
from tensorflow.keras.models import load_model

from double_digits import preprocess_image
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  
from tensorflow.keras.models import load_model
from tensorflow.nn import softmax  # または keras.activations.softmax

# モデルを読み込むときに custom_objects を指定
model = load_model("trained_model_v1.h5", custom_objects={"softmax_v2": softmax})

@app.route('/')
def index():
    return render_template('web.html')

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    img_str = data['image']
    processed = preprocess_image(img_str)
    pred = model.predict(processed)
    result = int(pred.argmax())
    confidence = float(pred[0][result])  # 最大信頼度の値を取得（例：0.8764）

    return jsonify({"result": result, "confidence": confidence})

if __name__ == '__main__':
    app.run(debug=True)

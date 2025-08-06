from flask import Flask, render_template, request, jsonify
from tensorflow.keras.models import load_model

# !pip install nbimporter
import nbimporter
from double_digits import load_double_data

app = Flask(__name__)
model = load_model('model.h5')  # モデル読み込み(作成したモデルの名前に変更してください)

@app.route('/')
def index():
    return render_template('web.html')

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    img_str = data['image']
    processed = double_digits.preprocess_image(img_str)
    pred = model.predict(processed)
    result = int(pred.argmax())
    return jsonify({"result": result})

if __name__ == '__main__':
    app.run(debug=True)

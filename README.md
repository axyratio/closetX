# closetX
you can use this by command
```bash
# in your client
npm install

# start project
npx expo start
```
```bash
# in your server
pip install -r requirements.py

# start project for test
celery -A app.utils.order_task worker --loglevel=info --pool=solo

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

stripe listen --forward-to localhost:8000/stripe/webhook
```



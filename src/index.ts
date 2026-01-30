
import { middleware } from '#middlewares/mdlwr.js';
import express from 'express';

const app = express();

const port = process.env.PORT ?? '3000';

app.get('/', middleware);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});

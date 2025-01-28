import express from 'express';

const initViewEngine = (app) => {
    app.use(express.static('src/assets'));
    app.set('view engine', 'ejs');
    app.set('views', './src/common/views');
}

export default initViewEngine;
const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const bunyan = require('bunyan');

const routes = require('./routes/index');
const groupRoute = require('./routes/groups');
const proteinRoute = require('./routes/protein');

const log = bunyan.createLogger({
    name: 'paxdb-API-orthologs',
    module: 'app'
});

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use('/', routes);
app.use('/protein', proteinRoute);
app.use('/group', groupRoute);

// catch 404 and forward to error handler
app.use((req, res, next) => {
    log.warn({
        msg: `'${req.url}' Not Found`,
        req
    });
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error-handling middleware, take the same form
// as regular middleware, however they require an
// arity of 4, aka the signature (err, req, res, next).
// when connect has an error, it will invoke ONLY error-handling
// middleware.

// If we were to next() here any remaining non-error-handling
// middleware would then be executed, or if we next(err) to
// continue passing the error, only error-handling middleware
// would remain being executed. Here we simply respond with an error page.

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    log.error({ err });
    res.status(err.status || 500);
    // production error handler - no stacktraces leaked to user:
    const params = { message: 'Looks like something went wrong!' };
    // development error handler - will print stacktrace
    if (app.get('env') === 'development') {
        params.message = `Error: ${err.message}`;
        params.error = err;
    }
    res.render('error', params);
});

process.on('uncaughtException', (err) => {
    log.fatal(err, 'uncaughtException');
    process.exit(1);
});


module.exports = app;

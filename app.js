const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const bunyan = require('bunyan');
const retry = require('retry');
const backend = require('paxdb-orthology-lib');

const connectRetryOptions = {
    retries: 30,
    factor: 1.1,
    minTimeout: 1 * 1000,
    maxTimeout: 10 * 1000,
    maxRetryTime: 300 * 1000, // The maximum time (in milliseconds) that the retried operation is allowed to run.
    randomize: true,
};

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

app.connectRetryWithSomeBackoff = function connectRetryWithSomeBackoff(cb) {
    const operation = retry.operation(connectRetryOptions);

    operation.attempt((currentAttempt) => {
        log.info(`${currentAttempt} connection attempt to ${process.env.NEO4J_URL} at ${new Date()}`);
        let neo4j = backend({
            server: process.env.NEO4J_URL,
            user: process.env.NEO4J_USER,
            pass: process.env.NEO4J_PASS
        });

        neo4j.count('NOG')
            .then((num) => {
                log.info(`connection works, total groups: ${num}`);
                cb(neo4j);
            })
            .catch((reason) => {
                log.warn(`failed to connect with the provided password: ${reason.message}`);
                if (reason.statusCode === 401 && reason.message.toLowerCase()
                    .indexOf('invalid username or password') >= 0) {
                    log.info('will try with the default password');

                    const tmpNeo = backend({
                        server: process.env.NEO4J_URL,
                        user: 'neo4j',
                        pass: 'neo4j'
                    });

                    tmpNeo.count('NOG')
                        .then(() => {
                            log.warn('using the default password, consider changing it!');
                            cb(tmpNeo);
                        })
                        .catch((err2) => {
                            log.warn('failed using the default password');
                            if (err2.statusCode === 403 && err2.message.toLowerCase()
                                .indexOf('change their password') > -1) {
                                log.info('fresh neo4j instance, must change the initial password');
                                tmpNeo.changePassword(process.env.NEO4J_PASS, (err) => {
                                    if (err) {
                                        log.error(err, 'failed to change the initial password');
                                        if (operation.retry(reason)) {
                                            return;
                                        }
                                        process.exit(1);
                                    }
                                    //not sure if the previous neo4j be reused
                                    neo4j = backend({
                                        server: process.env.NEO4J_URL,
                                        user: process.env.NEO4J_USER,
                                        pass: process.env.NEO4J_PASS
                                    });
                                    cb(neo4j);
                                });
                            } else {
                                log.error(err2, 'cannot connect to the storage');
                                if (operation.retry(reason)) {
                                    return;
                                }

                                process.exit(2);
                            }
                        });
                } else {
                    log.error(reason, 'cannot connect to the storage');
                    if (operation.retry(reason)) {
                        return;
                    }

                    process.exit(3);
                }
            });
    });
};


// catch 404
app.use((req, res) => {
    log.info({
        msg: `'${req.url}' Not Found`,
        req
    });
    res.status(404);

    // respond with html page
    if (req.accepts('html')) {
        res.render('error', { message: `${req.url} not found` });
        return;
    }

    // respond with json
    if (req.accepts('json')) {
        res.type('application/json')
            .send({ error: 'Not found' });
        return;
    }

    // default to plain-text. send()
    res.type('txt')
        .send('Not found');
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
    if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') {
        app.connectRetryWithSomeBackoff((neo4j) => {
            log.info('re-connected to neo4j!');
            app.set('neo4j', neo4j);
        });
    }
    res.status(err.status || 500);
    // production error handler - no stacktraces leaked to user:
    const params = { message: 'Looks like something went wrong!' };
    // development error handler - will print stacktrace
    if (app.get('env') === 'development') {
        params.message = err.message;
        params.error = err;
    }
    res.render('error', params);
});

process.on('uncaughtException', (err) => {
    log.fatal(err, 'uncaughtException');
    process.exit(1);
});

module.exports = app;

import app from './app';

// the entry point for the server application
(() => {
    console.log('Starting bot server...');
    app().catch((e) => {
        console.log(e);
    });
})();

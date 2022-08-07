var path = require('path');

module.exports = {
    entry: {
        index:'./index.ts'
    },
    output: {
        path: path.resolve(__dirname, './dist'),
        filename: '[name].js'
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use:['ts-loader']
            }
        ]
    }
};
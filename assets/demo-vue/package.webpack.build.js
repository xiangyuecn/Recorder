var path = require('path');
var VueLoaderPlugin = require('vue-loader/lib/plugin')

module.exports = {
    entry: './index.js',
    output: {
        path: path.resolve(__dirname, './dist'),
        filename: 'index.js'
    },
    module: {
        rules: [
            {
                test: /\.vue$/,
                use:['vue-loader']
            },
            {
                test:/\.js$/,
                use:['babel-loader?presets[]=env']
            },
            {
                test:/\.css$/,
                use:['style-loader','css-loader']
            }
        ]
    }
    ,plugins: [
      new VueLoaderPlugin()
    ]
};
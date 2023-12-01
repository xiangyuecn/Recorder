var fs = require("fs");
var path = require('path');
var VueLoaderPlugin = require('vue-loader/lib/plugin')

//人肉复制外面的RecordApp配置文件到这个文件夹里面来，躺着懒得挣扎
if(fs.existsSync("../../app-support-sample")){
    !fs.existsSync("copy")&&fs.mkdirSync("copy");
    var copyFile=function(src,dist,add){
        var txt=fs.readFileSync(src,'utf-8');
        fs.writeFileSync(dist, add+txt);
        console.log("已复制"+dist);
    };
    
    //测试demo每个js前面注入一段代码
    var demoAddJs='';
    
    copyFile("../../app-support-sample/native-config.js","copy/native-config.js",demoAddJs);
}else{
    console.error("未能copy RecordApp的配置文件，请确保本目录内存在 `copy` 目录，并且放置了配置文件native-config.js，否则将无法编译recordapp.vue文件");
};


module.exports = {
    entry: {
        index:'./index.js'
        ,recordapp:'./recordapp.js'
    },
    output: {
        path: path.resolve(__dirname, './dist'),
        filename: '[name].js'
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
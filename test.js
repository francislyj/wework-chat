const Sdk = require("./index"); //引入nodejs的java模块

try{
    let sdk = Sdk.NewSdkSync();

    console.log('====ok');
}catch(error){
    console.log('error =====>', error);
}

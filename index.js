const java = require("java");
const path = require('path');
const fs = require('fs');

const jdkPath = path.join(__dirname, "jar", "java_sdk.jar");

java.options.push('-Djava.library.path=' + path.join(__dirname, 'lib'));
java.classpath.push(jdkPath);

const Finance = java.import('com.tencent.wework.Finance'); //package.class



const newSlice = async function(){
    return Finance.NewSliceSync();
};

const freeSlice = async function(slice){
    Finance.FreeSliceSync(slice);
};


let sdk = Finance.NewSdkSync();

const init = async function(corpid, secret){
    let ret = Finance.InitSync(sdk, corpid, secret);
    if(ret != 0){
        Finance.DestroySdkSync(sdk);
        throw new Error('sdk init failed ret:' + ret);
    }
};


const getChatData = async function(seq, limit, proxy, passwd, timeout) {
    try{
        //每次使用GetChatData拉取存档前需要调用NewSlice获取一个slice，在使用完slice中数据后，还需要调用FreeSlice释放。
        let slice = await newSlice();
        let ret = Finance.GetChatDataSync(sdk, seq, limit, proxy, passwd, timeout, slice);
        if (ret != 0) {
            await freeSlice(slice);
            throw new Error('get chat data error: ret' + ret);
        }
        let result = Finance.GetContentFromSliceSync(slice);
        await freeSlice(slice);
        return result;
    }catch(error){
        throw error;
    }
};

const decryptData = async function(encrypt_key, encrypt_chat_msg){
    let msg = await newSlice();
    let ret = Finance.DecryptDataSync(sdk, encrypt_key, encrypt_chat_msg, msg);
    if (ret != 0) {
        await freeSlice(msg);
        throw new Error('parse content error ret' + ret);
    }
    const result = Finance.GetContentFromSliceSync(msg);
    await freeSlice(msg);
    return result;
};


const getMediaData = async function(sdkfileid, proxy, passwd, timeout, savefile){
    //媒体文件每次拉取的最大size为512k，因此超过512k的文件需要分片拉取。若该文件未拉取完整，sdk的IsMediaDataFinish接口会返回0，同时通过GetOutIndexBuf接口返回下次拉取需要传入GetMediaData的indexbuf。
    //indexbuf一般格式如右侧所示，”Range:bytes=524288-1048575“，表示这次拉取的是从524288到1048575的分片。单个文件首次拉取填写的indexbuf为空字符串，拉取后续分片时直接填入上次返回的indexbuf即可。
    let indexbuf = "";
    while(true){
        //每次使用GetMediaData拉取存档前需要调用NewMediaData获取一个media_data，在使用完media_data中数据后，还需要调用FreeMediaData释放。
        let media_data = Finance.NewMediaDataSync();
        let ret = Finance.GetMediaDataSync(sdk, indexbuf, sdkfileid, proxy, passwd, timeout, media_data);
        if(ret!=0){
            Finance.FreeMediaDataSync(media_data);
            throw new Error('get media data error ret' + ret);
            return;
        }
        console.log(`getmediadata outindex len:%d, data_len:%d, is_finis:%d`,Finance.GetIndexLen(media_data),Finance.GetDataLen(media_data), Finance.IsMediaDataFinish(media_data));
        try {
            //大于512k的文件会分片拉取，此处需要使用追加写，避免后面的分片覆盖之前的数据。
            fs.writeFileSync(savefile, Finance.GetDataSync(media_data));
        } catch (error) {
            console.log('wirie file error ====>', error);
        }

        if(Finance.IsMediaDataFinishSync(media_data) == 1) {
            //已经拉取完成最后一个分片
            Finance.FreeMediaDataSync(media_data);
            break;
        } else {
            //获取下次拉取需要使用的indexbuf
            indexbuf = Finance.GetOutIndexBufSync(media_data);
            Finance.FreeMediaDataSync(media_data);
        }
    }
};


module.exports = {
    init,
    getChatData,
    decryptData,
    getMediaData
};

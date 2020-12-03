const java = require("java");
const path = require('path');
const fs = require('fs');

const weworkJdkPath = path.join(__dirname, "jar", "java_sdk.jar");
const rsaPath = path.join(__dirname, "jar", "rsa.jar");

java.options.push('-Djava.library.path=' + path.join(__dirname, 'lib'));
java.classpath.push(weworkJdkPath);
java.classpath.push(rsaPath);

const Finance = java.import('com.tencent.wework.Finance');
const RSAUtil = java.import('org.francislyj.RSAUtil');


const getPrivateKey = function(publickey_ver, keyMap){
    return keyMap[publickey_ver];
};

class WeworkSdk {

    constructor(corpid, secret){
        this.sdk = Finance.NewSdkSync();
        let ret = Finance.InitSync(sdk, corpid, secret);
        if(ret != 0){
            Finance.DestroySdkSync(sdk);
            throw new Error('sdk init failed ret:' + ret);
        }
    }

    async decryptData(encrypt_key, encrypt_chat_msg){
        let msg = await this.newSlice();
        let ret = Finance.DecryptDataSync(this.sdk, encrypt_key, encrypt_chat_msg, msg);
        if (ret != 0) {
            await this.freeSlice(msg);
            throw new Error('parse content error ret' + ret);
        }
        const result = Finance.GetContentFromSliceSync(msg);
        await this.freeSlice(msg);
        return result;
    };

    /**
     * 拉取回话内容
     * params: keyMap 私钥键值对{version, privateKey} 需采用RSA PKCS1秘钥
     * */
    async getChatData(seq, limit, proxy, passwd, timeout, keyMap) {
        if(!keyMap){
            throw new Error("param keyMap must not be null");
        }

        for(let version in keyMap){
            let value = keyMap[version];
            if(value.indexOf("BEGIN RSA PRIVATE KEY") < 0){
                throw new Error("private key must be rsa pkcs1");
            }
        }

        seq = seq || 0;
        limit = limit || 10;
        timeout = timeout || 20;

        //每次使用GetChatData拉取存档前需要调用NewSlice获取一个slice，在使用完slice中数据后，还需要调用FreeSlice释放。
        let slice = await this.newSlice();
        let ret = Finance.GetChatDataSync(this.sdk, seq, limit, proxy, passwd, timeout, slice);
        if (ret != 0) {
            await this.freeSlice(slice);
            throw new Error('get chat data error: ret' + ret);
        }
        let result = Finance.GetContentFromSliceSync(slice);
        await this.freeSlice(slice);

        result = JSON.parse(result);
        if(result.errcode == 0){
            const chatdatas = result.chatdata;

            for(let chatdata of chatdatas){
                try{
                    let privateKey = getPrivateKey(chatdata.publickey_ver, keyMap);
                    if(!!privateKey){
                        let encrypt_key = await this.decryptRSA(privateKey, chatdata.encrypt_random_key);
                        let content = await this.decryptData(encrypt_key, chatdata.encrypt_chat_msg);
                        chatdata.content = JSON.parse(content);
                    }
                }catch(error){
                    console.log('chat decrypt error:', error);
                }
            }
        }
        return result;
    };

    async decryptRSA(privateKey, ncrypt_random_key){
        let privateKeyObj  = RSAUtil.getPrivateKeySync(privateKey);
        let str  = RSAUtil.decryptRSASync(ncrypt_random_key, privateKeyObj);
        return str;
    };

    async newSlice(){
        return Finance.NewSliceSync();
    };

    async freeSlice(slice){
        Finance.FreeSliceSync(slice);
    };

    async getMediaData(sdkfileid, proxy, passwd, timeout, savefile){
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
}



module.exports = WeworkSdk;

import {ApiPromise, WsProvider} from '@polkadot/api';
import {web3FromSource} from '@polkadot/extension-dapp';
import {parseError} from "./misc";


class WikaNetwork {

    constructor(endpoint) {
        this.endpoint = endpoint ;
        this.api = null ;
    }

    connect = (callback) => {
        let self = this ;
        self.wsProvider = new WsProvider(self.endpoint) ;
        return ApiPromise.create({ provider: self.wsProvider })
            .then((api) => {
                self.api = api ;
                callback() ;
            }) ;
    }

    disconnect = (callback) => {
        return this.api.disconnect().then(callback) ;
    }

    getBalance = (address, callback) => {
        return this.api.query.system.account(address, callback) ;
    }

    getUrl = (url, callback) => {
        return this.api.query.likes.urls(url, callback) ;
    }

    getLike = (address, url, callback) => {
        return this.api.query.likes.likes(address, url, callback) ;
    }

    getLikePrice = (callback) => {
        return this.api.query.likes.likePrice(callback) ;
    }

    getOwnersRequestPrice = (callback) => {
        return this.api.query.owners.requestPrice(callback) ;
    }

    getUrlOwner = (url, callback) => {
        return this.api.query.owners.owners(url, callback) ;
    }

    getOwnerRequest = (url, callback) => {
        return this.api.query.owners.requests(url, callback) ;
    }

    getOwnerResult = (url, callback) => {
        return this.api.query.owners.results(url, callback) ;
    }

    getBlockNumber = (callback) => {
        return this.api.query.system.number(callback) ;
    }

    getUrlInfo = (address, url, callback) => {
        Promise.all([this.api.query.likes.urls(url),this.api.query.likes.likes(address, url)])
            .then((result) => {
                let ans = {
                    urlLikes: Number(result[0][0]),
                    likesSubmittedAt: Number(result[1][0]),
                    likesSubmittedCount:Number(result[1][1]),
                    likesSubmittedRemaining:Number(result[1][2])
                } ;
                callback(ans) ;
            }) ;
    }




    txLike = (address, injector, url, referrer, numLikes, callback) => {
        let tx = this.api.tx.likes.like(url, referrer, numLikes) ;
        return tx.signAndSend(address, {signer: injector.signer}, callback) ;
    }

    txOwnerRequest = (address, injector, url, callback) => {
        let tx = this.api.tx.owners.requestUrlCheck(url) ;
        return tx.signAndSend(address, {signer: injector.signer}, callback) ;
    }

    txLikeExt = (source, address, url, referrer, numLikes, callback) => {
        console.log(source, address, url, referrer, numLikes);
        let self = this;
        let memory = {} ;
        let monitor = (result) => {
            let status = result.status ;
            if (status.isInBlock) {
                callback({status:'In block'}) ;
            } else if (status.isFinalized) {
                memory.unsubTransaction();
                let err = parseError(result) ;
                if (err) {
                    callback({status:'Error', err: err}) ;
                } else {
                    callback({status:'Done'}) ;
                }
            }
        }
        web3FromSource(source).then((injector) => {
            callback({status:'Sending'}) ;
            self.txLike(address, injector, url, referrer, numLikes, monitor).then((s) => {
                memory.unsubTransaction = s;
            }).catch((err) => {
                self.setState({txStatus: null}) ;
                callback({status:'Error', err: err}) ;
            }) ;
        });
    }



}

export default WikaNetwork ;

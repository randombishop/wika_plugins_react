import React from 'react';
import ReactDOM from 'react-dom';

import {
  web3Accounts,
  web3Enable,
  web3FromAddress
} from '@polkadot/extension-dapp';
import {cryptoWaitReady} from '@polkadot/util-crypto';
import Identicon from '@polkadot/react-identicon';

import WikaNetwork from './utils/network' ;
import {convertToWika, wikaToUsd, parseError, formatWika} from "./utils/misc";
import Popup from './utils/popup';
import './css/wika.css';
import './css/pico.min.css';
import './css/index.css'
import Ring from "react-cssfx-loading/lib/Ring";


class WikaLike extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isPopupOpen: false,
      txStatus: null,
      numLikes: 1,
      crypto: {
        status: 'loading'
      },
      network: {
        type: "Test Net",
        url: "wss://testnode3.wika.network:443",
        status: 'connecting'
      },
      wallets: null,
      accounts: [],
      balances: [],
      account: null,
      balance: {
        wika:null,
        usd:null
      }
    };
  }

  loadCrypto = () => {
    let self = this ;
    let cryptoState = self.state.crypto ;
    cryptoState.status = 'loading' ;
    self.setState({crypto:cryptoState}, () => {
      cryptoWaitReady().then(() => {
        cryptoState.status = 'ready' ;
        self.setState({crypto: cryptoState}, self.connectNetwork) ;
      }) ;
    }) ;
  }

  connectNetwork = (callback) => {
    let self = this ;
    let networkState = self.state.network ;
    networkState.status = 'connecting' ;
    self.setState({network:networkState}, () => {
      let network = new WikaNetwork(self.state.network.url) ;
      network.connect(() => {
        self.wikaNetwork = network ;
        networkState.status = 'connected' ;
        self.setState({network:networkState}, this.enableWeb3) ;
      }) ;
    }) ;
  }

  enableWeb3 = () => {
    this.setState({wallets: null}, () => {
      web3Enable("Wika Network").then((result) => {
        this.setState({wallets: result}, this.getAccounts);
      });
    });
  }

  getAccounts = () => {
    this.setState({accounts: []}, () => {
      web3Accounts().then((result) => {
        this.setState({accounts: result, balances: Array(result.length).fill({        
          wika:null,
          usd:null
        })}, this.subscribeToUrl);
      });
    });
  }

  subscribeToUrl = () => {
    let self = this;
    let thisUrl = window.location.href ;
    if (self.unsubUrl) {
        self.unsubUrl() ;
        self.unsubUrl = null ;
    }
    self.wikaNetwork.getUrl(thisUrl, (result) => {
        let urlLikes = Number(result[0]) ;
        self.setState({urlLikes:urlLikes}, this.getBalancesInfo) ;
    }).then((s) => {
        self.unsubUrl = s ;
    }).catch((err) => {
        alert(err) ;
    }) ;
  }

  getBalancesInfo = () => {
    let self = this;
    let currentBalances = self.state.balances

    self.setState({balances:currentBalances}, () => {
      if (self.state.accounts && self.state.network.status==='connected') {
        for(let i in self.state.accounts){
          let address = self.state.accounts[i].address
          self.wikaNetwork.getBalance(address, (result) => {
            let balanceWika = convertToWika(result.data.free) ;
            let balanceUsd = wikaToUsd(balanceWika) ;
            currentBalances[i] = {
              wika:balanceWika,
              usd:balanceUsd
            }

            self.setState({balances:currentBalances});
          });
        }
      }
    });
  }

  selectAccount(account) {
    this.setState({account: account}, this.subscribeToLike) ;
  }

  subscribeToLike = () => {
    let self = this;
    if (self.unsubLike) {
        self.unsubLike() ;
        self.unsubLike = null ;
    }
    let address = this.state.account.address;
    let thisUrl = window.location.href ;
    self.wikaNetwork.getLike(address, thisUrl, (result) => {
        self.setState({
            likesSubmittedAt:Number(result[0]),
            likesSubmittedCount:Number(result[1]),
            likesSubmittedRemaining:Number(result[2])
        }, this.subscribeToBalance) ;
    }).then((s) => {
        self.unsubLike = s ;
    }).catch((err) => {
        alert(err) ;
    }) ;
  }

  subscribeToBalance = () => {
    let self = this;
    if (self.unsubGetBalance) {
      self.unsubGetBalance() ;
      self.unsubGetBalance = null ;
    }
    let clearBalance = {
      wika:null,
      usd:null
    } ;
    self.setState({balance:clearBalance}, () => {
      if (self.state.account && self.state.network.status==='connected') {
      let address = self.state.account.address;
      self.wikaNetwork.getBalance(address, (result) => {
        let balanceWika = convertToWika(result.data.free) ;
        let balanceUsd = wikaToUsd(balanceWika) ;
        self.setState({
          balance:{
            wika:balanceWika,
            usd:balanceUsd
          }
        });
      }).then((s) => {
        self.unsubGetBalance = s ;
      });
    }
    }) ;
  }

  selectLikes = (numLikes) => {
    if (numLikes < 0){
      alert('Like cannot be less than zero')
    } else if (!Number.isInteger(parseFloat(numLikes))){
      alert('You must submit an Integer')
    } else if (this.state.balance.wika < numLikes){
      alert('Your balance is '+ this.state.balance.wika + 'wikas. Please lower the amount of like you wish to send')
    } else {
      this.setState({numLikes: numLikes}, this.sendLike)
    }
  }

  sendLike = () => {
    let self = this; 
    let thisUrl = window.location.href ;
    let referrer = null ;
    let numLikes = self.state.numLikes ;
    let address = this.state.account.address ;
    let likesSubmittedCount = Number.parseInt(this.state.likesSubmittedCount)
    this.setState({oldSubmittedCount: likesSubmittedCount})
    this.togglePopup()

    web3FromAddress(address).then((injector) =>{
      self.setState({txStatus: 'Sending...'}, () => {
        // self.wikaNetwork.txLike(address, injector, thisUrl, referrer, numLikes, this.monitorLike).then((s) => {
        self.wikaNetwork.txLike(address, injector, thisUrl, referrer, numLikes,  ({ status }) => {
          console.log(`Current status: ${status.type}`);
          this.setState({txStatus: status.type}) ;
          let err = parseError(status) ;
          if (err) {
            alert(err) ;
          }

        } ).then((s) => {
          this.togglePopup()
        }).catch((err) => {
          self.setState({txStatus: null}) ;
          alert(err) ;
        }) ;
      }) ;
    }) ;
  }

  togglePopup() {
    this.setState({ isPopupOpen: !this.state.isPopupOpen});
  }

  renderSwitch = () => {
    if (this.state.likesSubmittedCount > 0){
      return (this.renderThankyou());
    } else if (this.state.txStatus  && !(this.state.txStatus === 'Finalized' || this.state.txStatus === 'InBlock')){
      return this.renderTxStatus();
    } else if (this.state.account){
      return this.renderSelectLike();
    } else if (this.state.wallets === null) {
      return this.renderWait();
    } else if (this.state.wallets.length === 0) {
      return this.renderNone();
    } else {
      return this.renderAccounts();
    }
  }

  renderThankyou = () => {
    return (
      <React.Fragment>
        <h3>Thanks for liking!<span onClick={() => this.setState({account:null, likesSubmittedAt:null,  likesSubmittedCount:null, likesSubmittedRemaining:null}, this.renderSwitch)} className="round">&#8249;</span></h3>
        <span id='accountInfo'>Page Likes: {this.state.urlLikes} <br />Likes you sent: {this.state.likesSubmittedCount}</span>
        <button onClick={() => this.setState({account:null, likesSubmittedAt:null,  likesSubmittedCount:null, likesSubmittedRemaining:null}, this.togglePopup())}>Close</button>
      </React.Fragment>
    )
  }

  renderTxStatus = () => {
    return (
      <React.Fragment>
        sending...
      </React.Fragment>
    )
  }

  renderSelectLike = () => {
    let thisUrl = window.location.href ;
    return (
      <React.Fragment>
        <h3 className='likeHead'>How many likes to send? <span onClick={() => this.setState({account:null}, this.renderSwitch)} className="round">&#8249;</span></h3>
        <span>{Math.floor(this.state.balance.wika) + ' - ' + this.state.numLikes + ' = ' + (Math.floor(this.state.balance.wika) - Number.parseInt(this.state.numLikes)) + ' remaining'}&nbsp; <strike>W</strike></span>
        <span>Page Likes: {this.state.urlLikes} Likes you sent: {this.state.likesSubmittedCount}</span>
        <input id='numLikes' type="number" min="0" defaultValue={this.state.numLikes} onChange={() => this.setState({numLikes:document.getElementById('numLikes').value})}/>
        <button className='selectLikes' onClick={() => this.selectLikes(this.state.numLikes)}>Submit</button>
      </React.Fragment>
    )
  }

  renderWait = () => {
    return (
      <p>
        <i className="fas fa-spinner" aria-busy="true"></i>
        <Ring color="darkgray" width="35px" height="35px" duration="3s" /> Waiting for wallet's authorization...
      </p>
    );
  }

  renderNone = () => {
    return (
      <React.Fragment>
        <p>
          <strong>No Polkadot wallets detected.</strong>
          <br/>
          Please install one and make sure you authorize this app to use it.
        </p>
        <div style={{textAlign: 'right'}}>
          <a href="https://polkadot.js.org/extension/" target="_blank" role="button" className="secondary" >Install Pokadot-JS Extension</a>
          &nbsp;&nbsp;
          <a href="/#" role="button" className="primary" onClick={this.enableWeb3}>Retry</a>
        </div>
      </React.Fragment>
    );
  }

  buttonStyle = {
    height: '60px',
    paddingTop: '4px',
    paddingBottom: '4px',
    lineHeight: 'normal'
  }

  renderAccounts = () => {
    const accounts = this.state.accounts
    const balances = this.state.balances
    const accountInfo = accounts.map((account, i) =>{
      return (
        <button key={i} className="outline secondary" style={this.buttonStyle} onClick={() => this.selectAccount(account)}>
          <div style={{display:'flex'}}>
            <div style={{display:'flex', marginRight:'30px', marginLeft:'1px'}}>
              <Identicon size={40} value={account.address}/>
            </div>
            <div style={{fontSize:'14px'}}>
              <div style={{textAlign: 'left'}}>{account.meta.name}</div>
              <div>{formatWika(balances[i].wika)}</div>
            </div>
          </div>
        </button>
      )
    })
    return (
      <React.Fragment>
        <h3>Select One Account:</h3>
        {accountInfo}
      </React.Fragment>
    )
  }

  render() {
    return (
      <div>
        <input
          type="button"
          value="Like"
          onClick={() => {this.loadCrypto(); this.togglePopup()}}
        />
        {this.state.isPopupOpen && <Popup
          content={this.renderSwitch()}
          handleClose={() => this.togglePopup()}
        />}
      </div>
    )
  }
}

// ========================================

ReactDOM.render(
  <WikaLike />,
  document.getElementById('root')
);



  // async sendLike () {
  //   const wsProvider = new WsProvider('wss://testnode3.wika.network:443');
  //   const api = await ApiPromise.create({ provider: wsProvider });
  //   const allInjected = await web3Enable('my cool dapp');
  //   const allAccounts = await web3Accounts();
  //   const SENDER = '5GWEiv2fSRoeaXwhTCP1qvnJRT8BVnXnTL8CVsnP8M3G7z2i';
  //   const injector = await web3FromAddress(SENDER);
  //   const url = "https://www.wika.network/docs/guides/getting-started"
  //   const referrer = null
  //   api.tx.likes.like(url, referrer, 1).signAndSend(SENDER, { signer: injector.signer })
  // };
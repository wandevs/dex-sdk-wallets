import { BaseWallet, getNetworkID, sendRawTransaction, getTransactionCount } from ".";
import AwaitLock from "await-lock";
import { txParams } from "./baseWallet";
import { Transaction } from "wanchaints-tx";
import { Base64 } from 'js-base64';

let TrezorConnect:any = require('trezor-connect').default;

export default class Trezor extends BaseWallet {
  public static LABEL = "Trezor";
  public static TYPE = "TREZOR";
  private awaitLock = new AwaitLock();
  public static PATH_TYPE = {
    WAN: "m/44'/5718350'/0'/0",
  };
  public static currentBasePath: string;
  public static currentIndex: number;
  public connected: boolean = false;
  public static CUSTOMIZAION_PATH = "Customization";
  public static PREFIX_ETHEREUM_PATH = "m/44'/60'/";
  public static addresses: { [key: string]: string } = {};

  public constructor() {
    super();
    const selectedBasePath = window.localStorage.getItem("Trezor:selectedBasePath") || Trezor.PATH_TYPE.WAN;
    const selectedIndex = Number(window.localStorage.getItem("Trezor:selectedIndex")) || 0;
    Trezor.setPath(selectedBasePath, selectedIndex);
  }

  public async initTransport() {
    try {
      Trezor.addresses = {};
      await TrezorConnect.init({
        // connectSrc: 'file://' + __dirname + '/trezor-connect/', // for trezor-connect hosted locally set endpoint to application files (ignore this field for connect hosted online, connect.trezor.io will be used by default)
        // connectSrc: 'https://sisyfos.trezor.io/connect-electron/',
        connectSrc: 'https://connect.trezor.io/8/',
        popup: true, // use trezor-connect UI, set it to "false" to get "trusted" mode and get more UI_EVENTs to render your own UI
        webusb: false, // webusb is not supported in electron
        debug: false, // see whats going on inside iframe
        lazyLoad: true, // set to "false" if you want to start communication with bridge on application start (and detect connected device right away)
        // // or set it to true, then trezor-connect not will be initialized unless you call some TrezorConnect.method() (this is useful when you dont know if you are dealing with Trezor user)
        manifest: {
          email: 'techsupport@wanchain.com',
          appUrl: 'testdex.wandevs.org'
        },
        env: 'chrome'
      })
      console.log('TrezorConnect is ready')
    } catch (error) {
      console.error('TrezorConnect init error', error.toString())
    }
  }

  public static getPathType(basePath: string) {
    return Object.values(Trezor.PATH_TYPE).indexOf(basePath) > -1 ? basePath : Trezor.CUSTOMIZAION_PATH;
  }

  public static setPath(basePath: string, index: number) {
    Trezor.currentBasePath = basePath;
    window.localStorage.setItem("Trezor:selectedBasePath", basePath);
    Trezor.currentIndex = index;
    window.localStorage.setItem("Trezor:selectedIndex", String(index));
  }

  public currentPath(): string {
    return Trezor.currentBasePath + "/" + Trezor.currentIndex.toString();
  }

  public type(): string {
    return Trezor.TYPE;
  }

  public id(): string {
    return Trezor.TYPE;
  }

  public signMessage(message: string): Promise<string> | null {
    return this.signPersonalMessage(message);
  }

  public async signPersonalMessage(message: string): Promise<string> {
    try {
      console.log('signPersonalMessage', message);
      await this.awaitLock.acquireAsync();
      let bHex = false;
      if (message.slice(0, 2) === "0x") {
        message = message.slice(2);
        bHex = true;
      } else {
        // message = Buffer.from(message).toString("hex");
      }
      console.log('signPersonalMessage', message);
      const result = await TrezorConnect.ethereumSignMessage({ path: this.currentPath(), message: message, hex: bHex });
      console.log('result:', result);
      if(!result.success) {
        throw new Error("Signature failed!");
      }

      const verify = await TrezorConnect.ethereumVerifyMessage({
        address:'0xfe67a8e6284908b002e25bece2814b49c52803cb',
        message: message,
        signature: result.payload.signature,
        hex: bHex
      });
      console.log('verify:', verify);
      console.log('length:', result.payload.signature.length);
      return "0x" + result.payload.signature;

    } catch (e) {
      throw e;
    } finally {
      this.awaitLock.release();
    }
  }

  public async signTransaction(txParams: txParams): Promise<string> {
    try {
      await this.awaitLock.acquireAsync();

      const networkID = await this.loadNetworkId();

      const tempTxParams = {
        Txtype: '0x01',
        nonce: txParams.nonce ? '0x' + txParams.nonce.toString(16) : '0x00',
        gasPrice: txParams.gasPrice ? '0x' + txParams.gasPrice.toString(16) : '0x29E8D60800',
        gasLimit: txParams.gasLimit ? '0x' + txParams.gasLimit.toString(16) : '0x30D40',
        to: txParams.to,
        value: txParams.value ? '0x' + Number(txParams.value).toString(16) : '0x00',
        data: txParams.data ? txParams.data : '0x',
      }
      console.log('tempTxParams:', tempTxParams);
      console.log('path:', this.currentPath());
      const result = await TrezorConnect.ethereumSignTransaction({
        path: this.currentPath(),
        transaction: {
          to: tempTxParams.to,
          value: tempTxParams.value,
          data: tempTxParams.data,
          chainId: networkID,
          nonce: tempTxParams.nonce,
          gasLimit: tempTxParams.gasLimit,
          gasPrice: tempTxParams.gasPrice,
          txType: 0x01
        }
      })
      console.log("sign result:", result);

      if (!result.success) {
        throw new Error("TrezorConnect.ethereumSignTransaction Failed");
      }

      const tx = new Transaction(tempTxParams, { chain: networkID });

      // Set the EIP155 bits
      tx.raw[7] = Buffer.from([networkID]); // v
      tx.raw[8] = Buffer.from([]); // r
      tx.raw[9] = Buffer.from([]); // s

      // Store signature in transaction
      tx.v = Buffer.from(result.payload.v.slice(2), "hex");
      tx.r = Buffer.from(result.payload.r.slice(2), "hex");
      tx.s = Buffer.from(result.payload.s.slice(2), "hex");

      console.log('signed tx:', tx);
      // EIP155: v should be chain_id * 2 + {35, 36}
      const signedChainId = Math.floor((tx.v[0] - 35) / 2);
      const validChainId = networkID & 0xff; // FIXME this is to fixed a current workaround that app don't support > 0xff
      if (signedChainId !== validChainId) {
        throw new Error("Invalid networkId signature returned. Expected: " + networkID + ", Got: " + signedChainId);
      }
      console.log('signedChainId', signedChainId, 'validChainId', validChainId);
      return `0x${tx.serialize().toString("hex")}`;
    } catch (e) {
      throw e;
    } finally {
      this.awaitLock.release();
    }
  }

  public async sendTransaction(txParams: txParams): Promise<string> {
    if (!txParams.nonce) {
      const currentAddress = await this.getAddresses();
      const nonce = await getTransactionCount(currentAddress[0], "pending");
      txParams.nonce = nonce;
    }
    const rawData = await this.signTransaction(txParams);
    return sendRawTransaction(rawData);
  }

  public async getAddressesWithPath(basePath: string, from: number, count: number): Promise<{ [key: string]: string }> {
    try {
      count = (count == 1) ? 3 : count; // change 1->3;

      await this.awaitLock.acquireAsync();

      let bundle=[];
      for (let i = from; i < from + count; i++) {
        const path = basePath + "/" + i.toString();
        if(Trezor.addresses[path]) {
          continue;
        }
        bundle.push({path:path, showOnTrezor: false});
      }
      if(bundle.length > 0) {
        const bundleResult = await TrezorConnect.ethereumGetAddress({
          bundle: bundle
        });
        if(!bundleResult.success) {
          throw new Error("Get address failed!");
        }
  
        for(let i=0; i<bundleResult.payload.length; i++) {
          Trezor.addresses[bundle[i].path] = bundleResult.payload[i].address.toLowerCase();
        }
      }

      this.connected = true;
      this.awaitLock.release();
      return Trezor.addresses;
    } catch (e) {
      // trezor disconnected
      this.connected = false;
      throw e;
    }
  }

  public async getAddresses(): Promise<string[]> {
    const address = await this.getAddressesWithPath(Trezor.currentBasePath, Trezor.currentIndex, 1);
    return Object.values(address);
  }

  public isSupported(): boolean {
    return !this.connected;
  }

  public isLocked(): boolean {
    return !this.connected;
  }

  public async loadNetworkId(): Promise<number> {
    return getNetworkID();
  }

  public async sendCustomRequest(method: string, params: any): Promise<any> {
    return null;
  }

  public name(): string {
    return "Trezor";
  }
}

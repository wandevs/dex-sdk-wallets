import { BaseWallet, getNetworkID, sendRawTransaction, getTransactionCount } from ".";
import AwaitLock from "await-lock";
import { txParams } from "./baseWallet";
import { Transaction } from "wanchaints-tx";
import { SignedMessage } from 'trezor-connect';
import { errors } from "ethers-wan";
import { Base64 } from 'js-base64';

declare global {
  interface Window {
    TrezorConnect: any;
  }
}

var TrezorConnect = window.TrezorConnect;

const U2fTransport = require("@ledgerhq/hw-transport-u2f").default;
const LedgerEth = require("@ledgerhq/hw-app-eth").default;

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

  public constructor() {
    super();
    const selectedBasePath = window.localStorage.getItem("Trezor:selectedBasePath") || Trezor.PATH_TYPE.WAN;
    const selectedIndex = Number(window.localStorage.getItem("Trezor:selectedIndex")) || 0;
    Trezor.setPath(selectedBasePath, selectedIndex);
  }

  public async initTransport() {
    // const transport = await U2fTransport.create();
    // this.eth = new LedgerEth(transport);
    // const config = await this.eth.getAppConfiguration();
    // this.ethAppVersion = config.version;
    try {
      var script = document.createElement("script");
      script.id = "jsonp";
      script.src = 'https://connect.trezor.io/8/trezor-connect.js';
      document.body.appendChild(script);

      TrezorConnect = window.TrezorConnect;

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
      await this.awaitLock.acquireAsync();
      if (message.slice(0, 2) === "0x") {
        message = message.slice(2);
      } else {
        message = Buffer.from(message).toString("hex");
      }
      const result = await TrezorConnect.signMessage({ path: this.currentPath(), message: message });
      // const result = await this.eth.signPersonalMessage(this.currentPath(), message);
      const sig = result.payload as SignedMessage;
      const sigString = Base64.decode(sig.signature);
      console.log("sigString:", sigString);
      return "0x" + sigString;
      // const v = parseInt(sig.signature, 10);// - 27; //MoLin: do not need to -27;
      // let vHex = v.toString(16);
      // if (vHex.length < 2) {
      //   vHex = `0${v}`;
      // }
      // return `0x${result.r}${result.s}${vHex}`;
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

      const tx = new Transaction(tempTxParams, { chain: networkID });

      // Set the EIP155 bits
      tx.raw[7] = Buffer.from([networkID]); // v
      tx.raw[8] = Buffer.from([]); // r
      tx.raw[9] = Buffer.from([]); // s

      const result = TrezorConnect.ethereumSignTransaction({
        path: this.currentPath(),
        transaction: {
          to: tx.to,
          value: tx.value,
          data: tx.data,
          chainId: networkID,
          nonce: tx.nonce,
          gasLimit: tx.gasLimit,
          gasPrice: tx.gasPrice,
          txType: tx.Txtype
        }
      })

      console.log("sign result:", result);

      if (!result.success) {
        throw new Error("TrezorConnect.ethereumSignTransaction Failed");
      }
      // Pass hex-rlp to ledger for signing
      // const result = await this.eth.signTransaction(this.currentPath(), tx.serialize().toString("hex"));

      // Store signature in transaction
      tx.v = Buffer.from(result.payload.v, "hex");
      tx.r = Buffer.from(result.payload.r, "hex");
      tx.s = Buffer.from(result.payload.s, "hex");

      console.log('signed tx:', tx);
      // EIP155: v should be chain_id * 2 + {35, 36}
      const signedChainId = Math.floor((tx.v[0] - 35) / 2);
      const validChainId = networkID & 0xff; // FIXME this is to fixed a current workaround that app don't support > 0xff
      if (signedChainId !== validChainId) {
        throw new Error("Invalid networkId signature returned. Expected: " + networkID + ", Got: " + signedChainId);
      }
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
      await this.awaitLock.acquireAsync();
      const addresses: { [key: string]: string } = {};
      for (let i = from; i < from + count; i++) {
        const path = basePath + "/" + i.toString();
        // const address = await this.eth.getAddress(path, false, false);
        const address = await TrezorConnect.ethereumGetAddress({
          path: path
        });
        addresses[path] = address.address.toLowerCase();
      }
      this.connected = true;
      this.awaitLock.release();
      return addresses;
    } catch (e) {
      // ledger disconnected
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

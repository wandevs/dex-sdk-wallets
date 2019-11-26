import { BaseWallet } from ".";
import { txParams } from "./baseWallet";

declare global {
  interface Window {
    web3: any;
    alertAntd?: any;
  }
}

export default class LightWallet extends BaseWallet {
  public static LABEL = "Wanchain Light Wallet";
  public static TYPE = "LIGHTWALLET";

  public currentAddress:string = "";

  public type(): string {
    return LightWallet.TYPE;
  }

  public id(): string {
    return LightWallet.TYPE+ ":" + this.currentAddress;
  }

  public loadNetworkId(): Promise<number> {
    return new Promise(async (resolve, reject) => {
      if (!this.isSupported()) {
        reject(BaseWallet.NotSupportedError);
      }
      window.web3.eth.getChainId((err: Error, networkId: number) => {
        if (err) {
          reject(err);
        } else {
          resolve(Number(networkId));
        }
      });
    });
  }

  public signMessage(message: string | Uint8Array): Promise<string> | null {
    return this.signPersonalMessage(message);
  }

  public signPersonalMessage(message: string | Uint8Array): Promise<string> {
    return new Promise(async (resolve, reject) => {
      if (!this.isSupported()) {
        reject(BaseWallet.NotSupportedError);
      }
      window.web3.eth.sign(message, this.currentAddress, (err: Error, res: string) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }

  public sendTransaction(txParams: txParams): Promise<string | undefined> {
    return new Promise(async (resolve, reject) => {
      if (!this.isSupported()) {
        reject(BaseWallet.NotSupportedError);
      }

      txParams.from = this.currentAddress;

      window.web3.eth.sendTransaction(txParams, (err: Error, res: string) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }

  public async sendCustomRequest(method: string, params?: any): Promise<any> {
    return null;
  }

  public getAllAddresses(): Promise<string[]> {
    return new Promise(async (resolve, reject) => {
      if (!this.isSupported()) {
        reject(BaseWallet.NotSupportedError);
      }

      window.web3.eth.getAccounts((err: Error, res: string[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }

  public getAddresses(): Promise<string[]> {
    return new Promise(async (resolve, reject) => {
      if (!this.isSupported()) {
        reject(BaseWallet.NotSupportedError);
      }

      if (this.currentAddress.length > 0) {
        resolve([this.currentAddress]);
      } else {
        resolve([]);
      }
    });
  }

  public static async enableBrowserExtensionWallet(): Promise<void> {
    
  }

  public isLocked(address: string | null): boolean {
    return !address;
  }

  public isSupported(): boolean {
    if(!!window.web3 && !!window.web3.eth) {
      return true;
    } else {
      return false;
    }
  }

  public name(): string {
    if (!this.isSupported()) {
      return "";
    }
    return "Wanchain Light Wallet";
  }
}

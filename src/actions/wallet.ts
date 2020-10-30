import { BigNumber } from "ethers-wan/utils";
import { getAccount, getWallet } from "../selector/wallet";
import {
  BaseWallet,
  WanWallet,
  ExtensionWallet,
  NeedUnlockWalletError,
  NotSupportedError,
  Ledger,
  Trezor,
  getNetworkID,
  LightWallet
} from "../wallets";
import { AccountState } from "../reducers/wallet";
export const WALLET_STEPS = {
  SELECT: "SELECT",
  CREATE: "CREATE",
  CREATE_CONFIRM: "CREATE_CONFIRM",
  BACKUP: "BACKUP",
  TEST_MNEMONIC: "TEST_MNEMONIC",
  ADD_FUNDS: "ADD_FUNDS",
  IMPORT: "IMPORT",
  DELETE: "DELETE"
};

const TIMER_KEYS = {
  ADDRESS: "ADDRESS",
  STATUS: "STATUS",
  BALANCE: "BALANCE",
  NETWORK: "NETWORK"
};

const timers: { [key: string]: { [key: string]: number } } = {};

const setTimer = (accountID: string, timerKey: string, nextTimer: number) => {
  if (!timers[accountID]) {
    timers[accountID] = {};
  }

  timers[accountID][timerKey] = nextTimer;
};

const clearTimer = (accountID: string) => {
  if (timers[accountID]) {
    Object.values(timers[accountID]).forEach(window.clearTimeout);
    timers[accountID] = {};
  }
};

const isTimerExist = (accountID: string) => {
  return !!timers[accountID];
};

export const destoryTimer = () => {
  Object.keys(timers).map(accountID => {
    clearTimer(accountID);
  });
};

export const cacheWallet = (wallet: WanWallet, password: string) => {
  return {
    type: "WANCHAIN_WALLET_CACHE_WALLET",
    payload: { wallet, password }
  };
};

export const setUnit = (unit: string, decimals: number) => {
  return {
    type: "WANCHAIN_WALLET_SET_UNIT",
    payload: { unit, decimals }
  };
};

export const initCustomLocalWallet = (walletClass: any) => {
  return {
    type: "WANCHAIN_WALLET_INIT_CUSTOM_LOCAL_WALLET",
    payload: { walletClass }
  };
};

export const selectWalletType = (type: string) => {
  return {
    type: "WANCHAIN_WALLET_SELECT_WALLET_TYPE",
    payload: { type }
  };
};

export const setTranslations = (translations: { [key: string]: string }) => {
  return {
    type: "WANCHAIN_WALLET_SET_TRANSLATIONS",
    payload: { translations }
  };
};

export const setWalletStep = (step: string) => {
  return {
    type: "WANCHAIN_WALLET_SET_STEP",
    payload: { step }
  };
};

export const initAccount = (accountID: string, wallet: BaseWallet) => {
  return {
    type: "WANCHAIN_WALLET_INIT_ACCOUNT",
    payload: {
      accountID,
      wallet
    }
  };
};

export const updateWallet = (wallet: BaseWallet) => {
  return {
    type: "WANCHAIN_WALLET_UPDATE_WALLET",
    payload: {
      wallet
    }
  };
};

export const loadAddress = (accountID: string, address: string | null) => {
  return {
    type: "WANCHAIN_WALLET_LOAD_ADDRESS",
    payload: { accountID, address }
  };
};

export const loadBalance = (accountID: string, balance: BigNumber) => {
  return {
    type: "WANCHAIN_WALLET_LOAD_BALANCE",
    payload: { accountID, balance }
  };
};

export const loadNetwork = (accountID: string, networkId: number | undefined) => {
  return {
    type: "WANCHAIN_WALLET_LOAD_NETWORK",
    payload: {
      accountID,
      networkId
    }
  };
};

export const selectAccount = (accountID: string, type: string) => {
  return async (dispatch: any, getState: any) => {
    if (
      type !== Ledger.TYPE &&
      type !== Trezor.TYPE
    ) {
      window.localStorage.setItem("WanWallet:lastSelectedWalletType", type);
      window.localStorage.setItem("WanWallet:lastSelectedAccountID", accountID);
    }
    await dispatch({
      type: "WANCHAIN_WALLET_SELECT_ACCOUNT",
      payload: { accountID }
    });
    const wallet = getWallet(getState(), accountID);
    if (wallet) {
      dispatch(watchWallet(wallet));
    }
  };
};

export const supportExtensionWallet = () => {
  return {
    type: "WANCHAIN_WALLET_SUPPORT_EXTENSION_WALLET"
  };
};

export const supportLightWallet = () => {
  return {
    type: "WANCHAIN_WALLET_SUPPORT_LIGHT_WALLET"
  };
};

export const lockAccount = (accountID: string) => {
  return {
    type: "WANCHAIN_WALLET_LOCK_ACCOUNT",
    payload: { accountID }
  };
};

export const unlockAccount = (accountID: string) => {
  return {
    type: "WANCHAIN_WALLET_UNLOCK_ACCOUNT",
    payload: { accountID }
  };
};

export const unlockBrowserWalletAccount = (account: AccountState, password: string) => {
  return async (dispatch: any) => {
    const hydroWallet = account.get("wallet") as WanWallet;
    if (hydroWallet) {
      await hydroWallet.unlock(password);
      dispatch(updateWallet(hydroWallet));
      dispatch(unlockAccount(hydroWallet.id()));
    }
  };
};

export const deleteBrowserWalletAccount = (account: AccountState) => {
  return async (dispatch: any) => {
    const hydroWallet = account.get("wallet") as WanWallet;
    const isLocked = account.get("isLocked");
    if (hydroWallet && !isLocked) {
      const accountID = hydroWallet.id();
      clearTimer(accountID);
      dispatch({ type: "WANCHAIN_WALLET_DELETE_ACCOUNT", payload: { accountID } });
      await hydroWallet.delete();
    }
  };
};

export const showWalletModal = () => {
  return {
    type: "WANCHAIN_WALLET_SHOW_DIALOG"
  };
};

export const hideWalletModal = () => {
  return {
    type: "WANCHAIN_WALLET_HIDE_DIALOG"
  };
};

export const loadWallet = (type: string, action?: any) => {
  return (dispatch: any, getState: any) => {
    const LocalWallet = getState().WalletReducer.get("LocalWallet") || WanWallet;
    switch (type) {
      case ExtensionWallet.TYPE:
        return dispatch(loadExtensitonWallet());
      case LightWallet.TYPE:
        return dispatch(loadLightWallet());
      case LocalWallet.TYPE:
        return dispatch(loadLocalWallets());
      default:
        if (action) {
          return action();
        }
        return;
    }
  };
};

export const loadExtensitonWallet = () => {
  return async (dispatch: any) => {
    let wallet;
    if (typeof window.wanchain !== "undefined") {
      wallet = new ExtensionWallet();
    }
    if (wallet && wallet.isSupported()) {
      dispatch(supportExtensionWallet());
      dispatch(watchWallet(wallet));
    } else {
      window.setTimeout(() => dispatch(loadExtensitonWallet()), 1000);
    }
  };
};

export const loadLightWallet = () => {
  return async (dispatch: any) => {
    try {
      let wallet;
      if (typeof window.web3 !== "undefined" && typeof window.web3.eth !== "undefined" && window.injectWeb3) {
        wallet = new LightWallet();
      }
      if (wallet && wallet.isSupported()) {
        dispatch(supportLightWallet());

        let addrs = await wallet.getAllAddresses()
        for(let i=0; i<addrs.length; i++) {
          const subWallet = new LightWallet();
          subWallet.currentAddress = addrs[i];
          dispatch(watchWallet(subWallet));
        }
      } else {
        window.setTimeout(() => dispatch(loadLightWallet()), 1000);
      }
    } catch (error) {
      console.log(error);
      window.setTimeout(() => dispatch(loadLightWallet()), 1000);
    }
  };
};

export const loadLocalWallets = () => {
  return (dispatch: any, getState: any) => {
    const LocalWallet = getState().WalletReducer.get("LocalWallet") || WanWallet;
    LocalWallet.list().map((wallet: any) => {
      dispatch(watchWallet(wallet));
    });
  };
};

export const loadLedger = () => {
  return async (dispatch: any) => {
    const wallet = new Ledger();
    await wallet.initTransport();
    dispatch(watchWallet(wallet));
    dispatch(connectLedger());
  };
};

export const connectLedger = () => {
  return {
    type: "WANCHAIN_WALLET_CONNECT_LEDGER"
  };
};

export const disconnectLedger = () => {
  return {
    type: "WANCHAIN_WALLET_DISCONNECT_LEDGER"
  };
};

export const loadTrezor = () => {
  return async (dispatch: any) => {
    const wallet = new Trezor();
    await wallet.initTransport();
    dispatch(watchWallet(wallet));
    dispatch(connectLedger());
  };
};

export const connectTrezor = () => {
  return {
    type: "WANCHAIN_WALLET_CONNECT_TREZOR"
  };
};

export const disconnectTrezor = () => {
  return {
    type: "WANCHAIN_WALLET_DISCONNECT_TREZOR"
  };
};

export const watchWallet = (wallet: BaseWallet) => {
  return async (dispatch: any, getState: any) => {
    const accountID = wallet.id();
    const type = wallet.type();

    if (isTimerExist(accountID)) {
      clearTimer(accountID);
    }
    if (!getAccount(getState(), accountID)) {
      await dispatch(initAccount(accountID, wallet));
    } else {
      await dispatch(updateWallet(wallet));
    }

    const watchAddress = async () => {
      const timerKey = TIMER_KEYS.ADDRESS;
      let address;
      try {
        const addresses: string[] = await wallet.getAddresses();
        address = addresses.length > 0 ? addresses[0] : null;
      } catch (e) {
        if (type === Ledger.TYPE) {
          dispatch(disconnectLedger());
          clearTimer(accountID);
        } else if (type === Trezor.TYPE) {
          dispatch(disconnectTrezor());
          clearTimer(accountID);
        } else if (e !== NeedUnlockWalletError && e !== NotSupportedError) {
          throw e;
        }
        address = null;
      }

      const walletIsLocked = wallet.isLocked(address);
      const walletStoreLocked = getState().WalletReducer.getIn(["accounts", accountID, "isLocked"]);

      if (walletIsLocked !== walletStoreLocked) {
        dispatch(walletIsLocked ? lockAccount(accountID) : unlockAccount(accountID));
      }

      const currentAddressInStore = getState().WalletReducer.getIn(["accounts", accountID, "address"]);

      if (currentAddressInStore !== address) {
        dispatch(loadAddress(accountID, address));
        const lastSelectedAccountID = window.localStorage.getItem("WanWallet:lastSelectedAccountID");
        const currentSelectedAccountID = getState().WalletReducer.get("selectedAccountID");
        if (!currentSelectedAccountID && (lastSelectedAccountID === accountID || !lastSelectedAccountID)) {
          dispatch(selectAccount(accountID, type));
        }
      }

      const nextTimer = window.setTimeout(() => watchAddress(), 3000);
      setTimer(accountID, timerKey, nextTimer);
    };

    const watchBalance = async () => {
      const timerKey = TIMER_KEYS.BALANCE;

      const address = getState().WalletReducer.getIn(["accounts", accountID, "address"]);
      if (address) {
        try {
          const balance = await wallet.getBalance(address);
          const balanceInStore = getState().WalletReducer.getIn(["accounts", accountID, "balance"]);

          if (balance.toString() !== balanceInStore.toString()) {
            dispatch(loadBalance(accountID, balance));
          }
        } catch (e) {
          if (e !== NeedUnlockWalletError && e !== NotSupportedError) {
            throw e;
          }
        }
      }
      const currentSelectedAccountID = getState().WalletReducer.get("selectedAccountID");
      const watcherRate = getWatcherRate(currentSelectedAccountID, accountID);
      const nextTimer = window.setTimeout(() => watchBalance(), watcherRate);
      setTimer(accountID, timerKey, nextTimer);
    };

    const watchNetwork = async () => {
      const timerKey = TIMER_KEYS.NETWORK;
      try {
        const networkId = await wallet.loadNetworkId();
        if (networkId && networkId !== getState().WalletReducer.getIn(["accounts", accountID, "networkId"])) {
          dispatch(loadNetwork(accountID, networkId));
        } else {
          const nextTimer = window.setTimeout(() => watchNetwork(), 3000);
          setTimer(accountID, timerKey, nextTimer);
        }
      } catch (e) {
        if (e !== NeedUnlockWalletError && e !== NotSupportedError) {
          throw e;
        }
      }
    };

    Promise.all([watchAddress(), watchBalance(), watchNetwork()]);
  };
};

const getWatcherRate = (selectedType: string, type: string) => {
  return selectedType === type && window.document.visibilityState !== "hidden" ? 30000 : 300000;
};

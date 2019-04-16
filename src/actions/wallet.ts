import { BigNumber } from "ethers/utils";

export const loadAccount = (type: string, address: string | null) => {
  return (dispatch: any) => {
    dispatch({
      type: "HYDRO_WALLET_LOAD_ACCOUNT",
      payload: { type, address }
    });
  };
};

export const loadBalance = (type: string, balance: BigNumber) => {
  return (dispatch: any) => {
    dispatch({
      type: "HYDRO_WALLET_LOAD_BALANCE",
      payload: { type, balance }
    });
  };
};

export const selectAccount = (type: string) => {
  return (dispatch: any) => {
    dispatch({
      type: "HYDRO_WALLET_SELECT_ACCOUNT",
      payload: { type }
    });
  };
};

export const supportExtensionWallet = () => {
  return (dispatch: any) => {
    dispatch({
      type: "HYDRO_WALLET_SUPPORT_EXTENSION_WALLET"
    });
  };
};

export const lockAccount = (type: string) => {
  return (dispatch: any) => {
    dispatch({
      type: "HYDRO_WALLET_LOCK_ACCOUNT",
      payload: { type }
    });
  };
};

export const unlockAccount = (type: string) => {
  return (dispatch: any) => {
    dispatch({
      type: "HYDRO_WALLET_UNLOCK_ACCOUNT",
      payload: { type }
    });
  };
};

export const showDialog = () => {
  return (dispatch: any) => {
    dispatch({
      type: "HYDRO_WALLET_SHOW_DIALOG"
    });
  };
};

export const hideDialog = () => {
  return (dispatch: any) => {
    dispatch({
      type: "HYDRO_WALLET_HIDE_DIALOG"
    });
  };
};
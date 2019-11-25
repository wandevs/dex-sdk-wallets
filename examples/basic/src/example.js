import React from "react";
import { connect } from "react-redux";
import { Wallet, getSelectedAccount, WalletButton, WalletButtonLong } from "wan-dex-sdk-wallet";
import "wan-dex-sdk-wallet/index.css";
class Example extends React.Component {
  componentDidMount() {
    try {
      console.log('Example componentDidMount');
      console.log(window.parent.lightWallet);
    } catch (error) {
      console.log(error);
    }
  }

  renderAccount(account) {
    return (
      <p>
        Address: {account.get("address")}
        <br />
        IsLock: {account.get("isLocked").toString()}
        <br />
        Eth Balance: {account.get("balance").toString()}
        <br />
        <br />
        <button
          className="HydroSDK-button"
          onClick={() =>
            account
              .get("wallet")
              .signPersonalMessage("0xff2137d657209247083297f72c85e10227634b221049a44c63348509a08d95cc")
              .then(alert, alert)
          }>
          Sign "0xff2137d657209247083297f72c85e10227634b221049a44c63348509a08d95cc"
        </button>

        <button
          className="HydroSDK-button"
          onClick={() =>
            account
              .get("wallet")
              .sendTransaction({to:"0x15f59e30ef6f881549ec6196b0633a2cdf3de54c", value:0})
              // .then(alert, alert)
              .then(console.log, console.log)
          }>
          Send Transaction
        </button>
      </p>
    );
  }
  render() {
    const { selectedAccount } = this.props;
    return (
      <div>
        <h2>Basic Example</h2>
        <Wallet title="Basic Wallet Demo" 
          nodeUrl="https://mywanwallet.io/testnet" 
          // defaultWalletType="LIGHTWALLET"
          // walletTypes={["LIGHTWALLET"]}
         />
        <WalletButton />
        <WalletButtonLong />
        <h2>Info</h2>
        <div>{selectedAccount ? this.renderAccount(selectedAccount) : <p>No selected Account</p>}</div>
      </div>
    );
  }
}

export default connect(state => {
  return {
    selectedAccount: getSelectedAccount(state)
  };
})(Example);

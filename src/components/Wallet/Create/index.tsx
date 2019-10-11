import * as React from "react";
import { connect } from "react-redux";
import Input from "../Input";
import { setWalletStep, WALLET_STEPS, cacheWallet, watchWallet } from "../../../actions/wallet";
import { WalletState } from "../../../reducers/wallet";
import { HydroWallet, truncateAddress, getBalance } from "../../../wallets";
import Select, { Option } from "../Select";
import { BigNumber } from "bignumber.js";


interface Props {
  dispatch: any;
  isRecovery?: boolean;
  walletTranslations: { [key: string]: any };
  LocalWallet: any;
}

interface State {
  password: string;
  confirmation: string;
  isConfirm: boolean;
  processing: boolean;
  mnemonic: string;
  errorMsg: string | null;

  loading: boolean;
  addresses: { [key: string]: string };
  balances: { [key: string]: BigNumber };
  pathType: string;
  realPath: string;
  index: number;
  currentAddress: string | null;
  currentPage: number;
  gotoPageInputValue: number;
  currentPath: string;
}

const mapStateToProps = (state: { WalletReducer: WalletState }) => {
  const walletState = state.WalletReducer;
  return {
    walletTranslations: walletState.get("walletTranslations"),
    LocalWallet: walletState.get("LocalWallet") || HydroWallet
  };
};

const batchCount = 3;
const basePath = "m/44'/5718350'/0'/0";
const defaultPath = "m/44'/5718350'/0'/0/0";
class Create extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      mnemonic: "",
      password: "",
      confirmation: "",
      isConfirm: true,
      processing: false,
      errorMsg: null,

      loading: false,
      pathType: basePath,
      realPath: basePath,
      index: 0,
      currentPage: 0,
      addresses: {},
      balances: {},
      currentAddress: null,
      gotoPageInputValue: 1,
      currentPath: defaultPath
    };
  }

  public componentDidUpdate(prevProps: Props, prevState: State) {
    const { password, confirmation } = this.state;
    if ((password && confirmation && password !== prevState.password) || confirmation !== prevState.confirmation) {
      this.setState({ isConfirm: password === confirmation });
    }
  }

  private async submit(e: React.FormEvent) {
    const { password, confirmation, mnemonic } = this.state;
    const { dispatch, isRecovery, LocalWallet } = this.props;
    e.preventDefault();
    if (password !== confirmation) {
      return;
    }

    this.setState({ processing: true });
    try {
      if (isRecovery) {
        const wallet = await LocalWallet.fromMnemonic(mnemonic, password);
        dispatch(watchWallet(wallet));
        dispatch(setWalletStep(WALLET_STEPS.SELECT));
      } else {
        const wallet = await LocalWallet.createRandom();
        dispatch(cacheWallet(wallet, password));
        dispatch(setWalletStep(WALLET_STEPS.BACKUP));
      }
    } catch (e) {
      this.setState({ processing: false, errorMsg: e.message });
    }
  }

  public render() {
    const { password, confirmation, isConfirm, processing } = this.state;
    const { walletTranslations } = this.props;
    return (
      <form className="HydroSDK-form" onSubmit={e => this.submit(e)}>
        {this.renderRecoveryInput()}
        {this.renderAddressSelection()}
        <Input
          label={walletTranslations.password}
          text={password}
          handleChange={(password: string) => this.setState({ password })}
        />
        <Input
          label={walletTranslations.confirm}
          errorMsg={isConfirm ? "" : walletTranslations.confirmErrorMsg}
          text={confirmation}
          handleChange={(confirmation: string) => this.setState({ confirmation })}
        />
        <div className="HydroSDK-desc">{walletTranslations.createDesc}</div>
        <button
          className="HydroSDK-button HydroSDK-submitButton HydroSDK-featureButton"
          type="submit"
          disabled={processing || !password || password !== confirmation}>
          {processing ? <i className="HydroSDK-fa fa fa-spinner fa-spin" /> : null} {walletTranslations.next}
        </button>
      </form>
    );
  }

  private renderRecoveryInput() {
    const { mnemonic, errorMsg } = this.state;
    const { isRecovery } = this.props;

    const handleChange = (mnemonic: string) => {
      this.setState({
        mnemonic,
        errorMsg: null
      });
    };

    if (!isRecovery) {
      return null;
    }

    return (
      <Input
        label="Recovery Phrase (12 words separated by space)"
        type="text"
        text={mnemonic}
        errorMsg={errorMsg}
        handleChange={(mnemonic: string) => handleChange(mnemonic)}
      />
    );
  }

  private async loadAddresses() {
    const { LocalWallet } = this.props;
    if (!LocalWallet) {
      return;
    }
    const { realPath, index } = this.state;
    this.setState({ loading: true });
    const addresses = await LocalWallet.getAddressesWithPath(realPath, index, batchCount);
    this.setState({ addresses, loading: false });
  }

  private getAddressOptions() {
    const { addresses, balances } = this.state;
    const addressOptions: Option[] = [];
    Object.keys(addresses).map((path: string) => {
      const address = addresses[path];
      const balance = balances[address];
      addressOptions.push({
        value: address,
        component: (
          <div className="HydroSDK-address-option">
            <span>
              <i className="HydroSDK-fa fa fa-check" />
              {truncateAddress(address)}
            </span>
            <span>
              {balance ? (
                balance.div("1000000000000000000").toFixed(5)
              ) : (
                <i className="HydroSDK-fa fa fa-spinner fa-spin" />
              )}{" "}
              WAN
            </span>
          </div>
        ),
        onSelect: () => {
          this.selectAccount(address, path);
        }
      });
    });
    return addressOptions;
  }

  public selectAccount(address: string, path: string) {
    this.setState({ currentAddress: address, currentPath: path });
  }

  private renderAddressSelection() {
    const { isRecovery } = this.props;

    if (!isRecovery) {
      return null;
    }
    const addressOptions = this.getAddressOptions();
    return (
      <div>
        <br/>
        <div className="HydroSDK-label">
          {"Select Custom Address:"}
          <button>{"Load"}</button>
        </div>
        <Select
            blank={"Default Address"}
            noCaret={addressOptions.length === 0}
            disabled={addressOptions.length === 0}
            options={addressOptions}
            selected={"Default Address"}
          />
      </div>
    );
  }
}

export default connect(mapStateToProps)(Create);

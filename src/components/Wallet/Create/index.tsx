import * as React from "react";
import { connect } from "react-redux";
import Input from "../Input";
import { setWalletStep, WALLET_STEPS, cacheWallet, watchWallet } from "../../../actions/wallet";
import { WalletState } from "../../../reducers/wallet";
import { HydroWallet, truncateAddress, getBalance } from "../../../wallets";
import Select, { Option } from "../Select";
import { BigNumber } from "bignumber.js";
import { Wallet } from "ethers-wan";
import ReactPaginate from "react-paginate";

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

    this.onLoadAddress = this.onLoadAddress.bind(this);
  }

  public componentDidUpdate(prevProps: Props, prevState: State) {
    const { password, confirmation, addresses, index } = this.state;
    const { LocalWallet, isRecovery } = this.props;
    if ((password && confirmation && password !== prevState.password) || confirmation !== prevState.confirmation) {
      this.setState({ isConfirm: password === confirmation });
    }

    if (isRecovery) {
      if (LocalWallet != prevProps.LocalWallet || index != prevState.index) {
        this.loadAddresses();
      }
      if (addresses !== prevState.addresses) {
        this.loadBalances();
      }
    }
  }

  private async submit(e: React.FormEvent) {
    console.log('submit:', e);
    const { password, confirmation, mnemonic, currentPath } = this.state;
    const { dispatch, isRecovery, LocalWallet } = this.props;
    e.preventDefault();
    if (password !== confirmation) {
      return;
    }

    this.setState({ processing: true });
    try {
      if (isRecovery) {
        const wallet = await LocalWallet.fromMnemonic(mnemonic, password, currentPath);
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

  private onLoadAddress(e: React.FormEvent) {
    e.preventDefault();
    this.setState({loading: true}, ()=>{ setTimeout(()=>{this.loadAddresses()}, 0)});
    

    // this.setState({loading : true});
    // await this.loadAddresses();
    // this.setState({loading : false});
  }

  private loadAddresses() {
    const { realPath, index, mnemonic } = this.state;
    const addresses : { [key: string]: string } = {};
    console.log('loadAddress');
    
    console.log('set loading true');
    try {
      for (let i = index; i < index + batchCount; i++) {
        const path = realPath + "/" + i.toString();
        addresses[path] = Wallet.fromMnemonic(mnemonic, path).address
      }
      this.setState({ addresses });
    } catch (error) {
      this.setState({errorMsg: error.message });
    }
    console.log('set loading false');
    this.setState({loading: false})
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

  private changePage = ({ selected }: { [key: string]: any }) => {
    this.setState({
      currentPage: selected,
      index: selected * batchCount
    });
  };

  private gotoPageSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { gotoPageInputValue } = this.state;
    const pageNumber = Number(gotoPageInputValue) - 1;
    this.setState({
      currentPage: pageNumber,
      index: pageNumber * batchCount
    });
  };

  private loadBalances() {
    const { addresses } = this.state;
    Object.keys(addresses).map(async (path: string) => {
      let { balances } = this.state;
      const address = addresses[path];
      const balance = await getBalance(address);
      balances[address] = new BigNumber(String(balance));
      this.setState({ balances });
      this.forceUpdate();
    });
  }

  private renderFooter() {
    const { currentPage, gotoPageInputValue } = this.state;
    return (
      <>
        <ReactPaginate
          key={currentPage}
          initialPage={currentPage}
          previousLabel={"<"}
          nextLabel={">"}
          breakLabel={"..."}
          pageCount={10000}
          marginPagesDisplayed={0}
          pageRangeDisplayed={2}
          onPageChange={this.changePage}
          containerClassName={"HydroSDK-pagination"}
          breakClassName={"break-me"}
          activeClassName={"active"}
        />
        <div className="HydroSDK-paginationGotoPage">
          Go to page
          <form onSubmit={this.gotoPageSubmit}>
            <input
              className="HydroSDK-input"
              type="number"
              min="1"
              step="1"
              value={gotoPageInputValue}
              onChange={event => this.setState({ gotoPageInputValue: parseInt(event.target.value, 10) })}
            />
          </form>
        </div>
      </>
    );
  }

  private renderAddressSelection() {
    const { isRecovery } = this.props;
    const { loading, currentAddress } = this.state;
    console.log('loading:', loading, isRecovery);
    if (!isRecovery) {
      return null;
    }
    const addressOptions = this.getAddressOptions();

    return (
      <div>
        <br/>
        <div className="HydroSDK-label">
          {"Select Address (option)"}
          <button type="load" onClick = {e => this.onLoadAddress(e)} 
            style={{width: "80px", height: "21px", margin: "0 0 0 14px" }}
            disabled={loading}>
            {loading ? <i className="HydroSDK-fa fa fa-spinner fa-spin" /> : null}
            {"Load"}
          </button>
        </div>
        <Select
            blank={"Default Address"}
            noCaret={addressOptions.length === 0}
            disabled={addressOptions.length === 0}
            options={addressOptions}
            selected={!loading && currentAddress}
            footer={this.renderFooter()}
          />
      </div>
    );
  }
}

export default connect(mapStateToProps)(Create);

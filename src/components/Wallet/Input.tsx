import * as React from "react";
interface Props {
  handleChange: (passowr: string) => any;
  text: string;
  label: string;
  type?: string;
  error?: boolean;
  errorMsg?: string | null;
}

class PasswordInput extends React.PureComponent<Props, {}> {
  public render() {
    const { handleChange, text, label, error, errorMsg, type } = this.props;
    return (
      <div className="WanchainSDK-fieldGroup">
        <div className="WanchainSDK-labelGroup">
          <div className="WanchainSDK-label">{label}</div>
          <div className="WanchainSDK-errorMsg">{errorMsg}</div>
        </div>
        <input
          className={`WanchainSDK-input${error ? " WanchainSDK-error" : ""}`}
          type={type || "password"}
          value={text}
          onChange={e => handleChange(e.target.value)}
        />
      </div>
    );
  }
}

export default PasswordInput;

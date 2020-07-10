import * as React from "react";
import Svg from "../Svg";

interface Props {
  iconName: string;
  title: string;
  desc: string;
}

interface State {}

class NotSupport extends React.PureComponent<Props, State> {
  public render() {
    const { iconName, title, desc } = this.props;
    return (
      <div className="WanchainSDK-notSupport">
        <Svg name={iconName} size="80" />
        <div className="WanchainSDK-notSupportTitle">{title}</div>
        <div className="WanchainSDK-notSupportDesc" dangerouslySetInnerHTML={{ __html: desc }} />
      </div>
    );
  }
}

export default NotSupport;

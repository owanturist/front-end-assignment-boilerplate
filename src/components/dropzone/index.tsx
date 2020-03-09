import { Maybe, Nothing } from 'frctl/Maybe';
import * as React from 'react';
import ReactDropzone from 'react-dropzone';
import styled from 'styled-components';

interface StyledRootProps {
  hovered: boolean;
}

const StyledRoot = styled.div<StyledRootProps>`
  background: ${properties => properties.hovered ? '#f8f8f8' : '#eee'};
  border-radius: 3px;
  color: #444;
  cursor: default;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
  font-size: 18px;
  outline: none;
  padding: 20px;
`;

const StyledContent = styled.div`
  align-items: center;
  border: 2px dashed #aaa;
  border-radius: 3px;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  min-height: 300px;
  padding: 20px;
`;

export interface Props {
  children?: React.ReactNode;
  onLoad(file: Maybe<File>): void;
}

interface State {
  hovered: boolean;
}

export default class Dropzone extends React.PureComponent<Props, State> {
  public readonly state: State = {
    hovered: false,
  };

  private readonly onDragEnter: () => void;

  private readonly onDragLeave: () => void;

  private readonly onFileLoad: (file: Maybe<File>) => void;

  public constructor(propserties: Props) {
    super(propserties);

    this.onDragEnter = () => this.setState({ hovered: true });

    this.onDragLeave = () => this.setState({ hovered: false });

    this.onFileLoad = file => {
      this.setState({ hovered: false });
      this.props.onLoad(file);
    };
  }

  public render(): React.ReactElement {
    return (
      <ReactDropzone
        accept="text/plain"
        multiple={false}
        onDropAccepted={(files: File[]) => this.onFileLoad(Maybe.fromNullable(files[0]))}
        onDropRejected={() => this.onFileLoad(Nothing)}
        onDragEnter={this.onDragEnter}
        onDragLeave={this.onDragLeave}
      >
        {({ getRootProps, getInputProps }) => (
          <StyledRoot {...getRootProps()} hovered={this.state.hovered}>
            <input {...getInputProps()} />

            <StyledContent>
              <div>{this.props.children}</div>
            </StyledContent>
          </StyledRoot>
        )}
      </ReactDropzone>
    );
  }
}

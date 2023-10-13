import React from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";
import { useField } from "payload/components/forms";
import { Label } from "payload/components/forms";
import { Props } from "payload/components/fields/Text";
import { Button } from "payload/components/elements";
import Popup from "payload/dist/admin/components/elements/Popup";

import "./styles.scss";

interface ColorInput extends Props {
  label: string;
}

const InputField: React.FC<ColorInput> = (props) => {
  const { path, label = "Color" } = props;
  const { value, setValue } = useField<string>({ path });
  const [color, setColor] = React.useState("#fff");

  const handleColorChange = (newColor): void => {
    setColor(newColor);
    setValue(newColor);
  };

  React.useEffect(() => {
    console.log("value", value);
    if (value) {
      setColor(value);
    }
  }, []);

  return (
    <div className="color-field">
      <Label htmlFor={path} label={label} />
      <div className="__input-row">
      <div className="color-swatch" style={{background: color}}>&nbsp;</div>
        <div className="field-type text">
          <HexColorInput
            className="color-input"
            id={path}
            color={color}
            onChange={handleColorChange}
          />
        </div>
        <Popup
          button={
            <Button size="small" className="color-button" buttonStyle="primary">
              Pick Color
            </Button>
          }
          buttonType="custom"
          render={() => (
            <HexColorPicker color={color} onChange={handleColorChange} />
          )}
        />
      </div>
      <p className="help-text">Hex Value Only.</p>
    </div>
  );
};

export default InputField;

import { Field } from 'payload/types';
import InputField from './InputField';
import Cell from './Cell';


type ColorField = Field & {
    label?: string;
}

const ColorField: ColorField = {
    name: 'color',
    type: 'text',
    label: 'Color',
    admin: {
        components: {
          Field: InputField,
          Cell
        },
      },
}

export default ColorField;
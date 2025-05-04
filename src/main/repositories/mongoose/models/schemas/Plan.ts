import { Schema } from "mongoose";

const planSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Schema.Types.Mixed, required: true }, // number or string
    private: { type: Boolean, default: false },
    features: {
      type: Map,
      of: Schema.Types.Mixed, // boolean, number or string
      required: true,
    },
    usageLimits: {
      type: Map,
      of: Schema.Types.Mixed, // boolean or number
    },
  },
  { _id: false } // Si quieres que el plan embebido no tenga _id (opcional según contexto)
);

export default planSchema;
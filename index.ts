import * as pulumi from "@pulumi/pulumi";

// Exported type.
export interface MyResourceInputs {
  myStringProp: pulumi.Input<string>;
  myBoolProp: pulumi.Input<boolean>;
}

// Non-exported type used by the provider functions.
// This interface contains the same inputs, but as un-wrapped types.
interface MyResourceProviderInputs {
  myStringProp: string;
  myBoolProp: boolean;
}

interface MyResourceProviderOutputs {
  myNumberOutput: number;
  myStringOutput: string;
}

class MyResourceProvider implements pulumi.dynamic.ResourceProvider {
  async create(
    inputs: MyResourceProviderInputs,
  ): Promise<pulumi.dynamic.CreateResult<MyResourceProviderOutputs>> {
    return {
      id: "",
      outs: {
        myNumberOutput: 0,
        myStringOutput: "",
      },
    };
  }

  async diff(
    id: string,
    oldOutputs: MyResourceProviderOutputs,
    newInputs: MyResourceProviderInputs,
  ): Promise<pulumi.dynamic.DiffResult> {
    return {
      changes: true,
    };
  }
}

class MyResource extends pulumi.dynamic.Resource {
  constructor(
    name: string,
    props: MyResourceInputs,
    opts?: pulumi.CustomResourceOptions,
  ) {
    super(new MyResourceProvider(), name, props, opts);
  }
}

import { fooSerializer, Foo } from "../lib/serialization"
import { expose, registerSerializer } from "../../src/worker"

registerSerializer(fooSerializer)

async function run(foo: Foo<string>) {
  return new Foo(foo.getValue() + foo.getValue())
}

expose(run)

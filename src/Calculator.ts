interface LambdaCostInput {
  requests: number;
  computeTimeMs: number;
  memorySizeGB: number;
  ephemeralStorageGB: number;
}

interface LambdaCostOutput {
  computeCost: number;
  requestCost: number;
  storageCost: number;
  totalCost: number;
}

export function calculateLambdaCost(input: LambdaCostInput): LambdaCostOutput {
  const msToSecondsConversionFactor = 0.001;
  const computePricePerGBs = 0.0000166667;
  const requestPrice = 0.0000002;
  const storagePricePerGBs = 0.0000000358;

  const totalComputeSeconds = input.requests * input.computeTimeMs * msToSecondsConversionFactor;
  const totalComputeGBs = input.memorySizeGB * totalComputeSeconds;
  const computeCost = totalComputeGBs * computePricePerGBs;
  const requestCost = input.requests * requestPrice;
  const totalStorageGBs = (input.ephemeralStorageGB - 0.5) * totalComputeSeconds;
  const storageCost = totalStorageGBs * storagePricePerGBs;
  const totalCost = computeCost + requestCost + storageCost;

  return {
    computeCost,
    requestCost,
    storageCost,
    totalCost,
  };
}

interface LambdaInvocationsInput {
  totalCost: number;
  computeTimeMs: number;
  memorySizeGB: number;
  ephemeralStorageGB: number;
}

interface LambdaInvocationOutput {
  invocations: number;
}

export function calculateLambdaInvocations(input: LambdaInvocationsInput): LambdaInvocationOutput {
  const msToSecondsConversionFactor = 0.001;
  const computePricePerGBs = 0.0000166667;
  const requestPrice = 0.0000002;
  const storagePricePerGBs = 0.0000000358;

  const computeSecondsPerInvocation = input.computeTimeMs * msToSecondsConversionFactor;
  const computeGBsPerInvocation = input.memorySizeGB * computeSecondsPerInvocation;
  const computeCostPerInvocation = computeGBsPerInvocation * computePricePerGBs;

  const requestCostPerInvocation = requestPrice;

  const storageSecondsPerInvocation = computeSecondsPerInvocation;
  const storageGBsPerInvocation = (input.ephemeralStorageGB - 0.5) * storageSecondsPerInvocation;
  const storageCostPerInvocation = storageGBsPerInvocation * storagePricePerGBs;

  const costPerInvocation = computeCostPerInvocation + requestCostPerInvocation + storageCostPerInvocation;
  const invocations = Math.floor(input.totalCost / costPerInvocation);

  return {
    invocations,
  };
}

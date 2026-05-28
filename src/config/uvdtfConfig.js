export const UVDTF_DEFAULT_CONFIG = {
    materialWidthCM: 55,
    printableWidthCM: 53,
    paddingCM: 0.4,
    minBillableMeters: 1,
    priceTiers: [
        { maxMeters: 2, price: 440000 },
        { maxMeters: 5, price: 390000 },
        { maxMeters: 10, price: 330000 },
        { maxMeters: Infinity, price: 280000 },
    ],
};

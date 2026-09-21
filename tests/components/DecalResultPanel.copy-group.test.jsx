// @vitest-environment jsdom
import { it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import DecalResultPanel from '../../src/components/decal/DecalResultPanel.jsx';
import { DECAL_DEFAULT_CONFIG as config } from '../../src/modules/decal/config/defaultConfig.js';
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});
function setup(mode = 'single') {
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const rows = [100, 200].flatMap((quantity) =>
        ['Decal giấy', 'Decal nhựa'].flatMap((decalType) =>
            [true, false].map((laminated) => ({
                quantity,
                decalType,
                laminated,
                price: 999000,
                finalPrice: 173000,
            }))
        )
    );
    const machines = ['Graptech', 'Avitech'].map((name, i) => ({
        name,
        layout: {
            count: 15,
            cols: 3,
            rows: 5,
            itemW: 50,
            itemH: 90,
            printableW: 302,
            printableH: 280,
        },
        priceTable: rows.map((r) => ({ ...r, finalPrice: r.finalPrice + i * 20000 })),
    }));
    render(
        <DecalResultPanel
            config={config}
            params={{
                stickerW: 50,
                stickerH: 90,
                shape: 'rectangle',
                laminationFilm: 'mo',
                sheetSizeKey: '0',
            }}
            result={{ mode, machines, sheetW: 330, sheetH: 330 }}
            onChange={() => {}}
        />
    );
    return writeText;
}
it('copies only the four variants of the clicked quantity with the selected machine final prices', async () => {
    const copy = setup();
    fireEvent.change(screen.getByLabelText(/Giá dùng khi copy/), { target: { value: '1' } });
    fireEvent.click(screen.getByTitle('Copy tất cả quy cách số lượng 100'));
    await waitFor(() => expect(copy).toHaveBeenCalledTimes(1));
    const text = copy.mock.calls[0][0];
    expect(text.match(/Giá:/g)).toHaveLength(4);
    expect(text.match(/193.000đ/g)).toHaveLength(4);
    expect(text).toContain('Decal giấy');
    expect(text).toContain('Decal nhựa');
    expect(text).toContain('cán màng mờ');
    expect(text).toContain('không cán màng');
    expect(text).not.toContain('999.000');
    expect(text).not.toContain('200 con');
    expect(screen.getByText('✓ Đã copy')).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Giá dùng khi copy/), { target: { value: '0' } });
    fireEvent.click(screen.getByTitle('Copy tất cả quy cách số lượng 200'));
    await waitFor(() => expect(copy).toHaveBeenCalledTimes(2));
    expect(copy.mock.calls[1][0].match(/173.000đ/g)).toHaveLength(4);
});
it('copies sheet dimensions and sheet units in sheet mode', async () => {
    const copy = setup('sheet');
    fireEvent.click(screen.getByTitle('Copy tất cả quy cách số lượng 100'));
    await waitFor(() => expect(copy).toHaveBeenCalledTimes(1));
    expect(copy.mock.calls[0][0]).toContain('210x297mm');
    expect(copy.mock.calls[0][0]).toContain('100 tờ');
    expect(copy.mock.calls[0][0]).not.toContain('50x90');
});

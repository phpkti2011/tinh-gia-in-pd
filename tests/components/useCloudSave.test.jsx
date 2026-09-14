// @vitest-environment jsdom
//
// Hook lưu cấu hình dùng chung cho MỌI tab Cài Đặt (10 module).
//
// Bản cũ của các panel báo alert('Đã lưu cài đặt!') ngay sau khi ghi localStorage
// của máy admin rồi bỏ mặc promise saveConfigToCloud. Supabase là đường DUY NHẤT
// đưa bảng giá sang máy người khác → lưu hỏng trong im lặng nghĩa là cả xưởng vẫn
// báo giá bằng bảng cũ mà admin tưởng đã xong.
//
// Chốt lại: chỉ rời tab khi cloud:true.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

import { useCloudSave } from '../../src/components/common/useCloudSave';
import SaveStatusBanner from '../../src/components/common/SaveStatusBanner';

afterEach(() => cleanup());

// Panel tối giản dùng đúng hook + banner như 10 panel thật.
function Harness({ saveLocal, onSave, onSaved, invalidMessage }) {
    const { status, error, saving, save } = useCloudSave({
        saveLocal,
        onSave,
        onSaved,
        invalidMessage,
    });
    return (
        <div>
            <SaveStatusBanner status={status} error={error} />
            <button onClick={() => save({ cfg: 1 })} disabled={saving}>
                Lưu
            </button>
        </div>
    );
}

function setup(opts) {
    const onSave = vi.fn(async () => opts.res);
    const onSaved = vi.fn();
    const saveLocal = vi.fn(() => opts.localOk !== false);
    render(
        <Harness
            saveLocal={saveLocal}
            onSave={onSave}
            onSaved={onSaved}
            invalidMessage={opts.invalidMessage}
        />
    );
    return { onSave, onSaved, saveLocal, click: () => fireEvent.click(screen.getByRole('button')) };
}

describe('Lên được đám mây', () => {
    it('báo "mọi máy sẽ nhận" và cho rời tab', async () => {
        const { onSave, onSaved, click } = setup({ res: { local: true, cloud: true } });
        click();
        await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
        expect(onSave).toHaveBeenCalledWith({ cfg: 1 });
        expect(screen.getByText(/mọi máy sẽ nhận cài đặt mới/)).toBeTruthy();
    });
});

describe('Chỉ lưu được máy này — ca bản cũ nói dối', () => {
    it('cảnh báo các máy khác CHƯA nhận và KHÔNG rời tab', async () => {
        const { onSaved, click } = setup({ res: { local: true, cloud: false } });
        click();
        await waitFor(() => expect(screen.getByText(/các máy khác CHƯA nhận/)).toBeTruthy());
        expect(onSaved).not.toHaveBeenCalled();
    });

    it('onSave trả undefined (panel chưa nối cloud) → vẫn coi là chỉ lưu máy này', async () => {
        const { onSaved, click } = setup({ res: undefined });
        click();
        await waitFor(() => expect(screen.getByText(/các máy khác CHƯA nhận/)).toBeTruthy());
        expect(onSaved).not.toHaveBeenCalled();
    });
});

describe('Lỗi', () => {
    it('cloud trả error → hiện lỗi, không rời tab', async () => {
        const { onSaved, click } = setup({ res: { local: true, error: 'forbidden' } });
        click();
        await waitFor(() => expect(screen.getByText(/Không lưu được: forbidden/)).toBeTruthy());
        expect(onSaved).not.toHaveBeenCalled();
    });

    it('local:false → hiện lỗi', async () => {
        const { onSaved, click } = setup({ res: { local: false, cloud: false } });
        click();
        await waitFor(() => expect(screen.getByText(/Không lưu được/)).toBeTruthy());
        expect(onSaved).not.toHaveBeenCalled();
    });

    it('onSave ném lỗi → bắt được, không vỡ UI', async () => {
        const onSaved = vi.fn();
        render(
            <Harness
                saveLocal={() => true}
                onSave={async () => {
                    throw new Error('mất mạng');
                }}
                onSaved={onSaved}
            />
        );
        fireEvent.click(screen.getByRole('button'));
        await waitFor(() => expect(screen.getByText(/Không lưu được: mất mạng/)).toBeTruthy());
        expect(onSaved).not.toHaveBeenCalled();
    });
});

describe('Cổng validate schema chạy TRƯỚC khi đụng tới cloud', () => {
    it('saveLocal trả false → KHÔNG gọi onSave, hiện đúng thông báo của module', async () => {
        const { onSave, onSaved, click } = setup({
            localOk: false,
            res: { local: true, cloud: true },
            invalidMessage: 'Cấu hình tờ rơi không hợp lệ, không lưu. Mở Console để xem lỗi.',
        });
        click();
        await waitFor(() => expect(screen.getByText(/Cấu hình tờ rơi không hợp lệ/)).toBeTruthy());
        expect(onSave).not.toHaveBeenCalled();
        expect(onSaved).not.toHaveBeenCalled();
    });
});

describe('Chống bấm Lưu 2 lần', () => {
    it('nút bị khoá trong lúc đang lưu → không tạo 2 version trên cloud', async () => {
        let release;
        const onSave = vi.fn(() => new Promise((r) => (release = r)));
        render(<Harness saveLocal={() => true} onSave={onSave} onSaved={() => {}} />);
        const btn = screen.getByRole('button');

        fireEvent.click(btn);
        await waitFor(() => expect(btn.disabled).toBe(true));
        fireEvent.click(btn);
        fireEvent.click(btn);
        expect(onSave).toHaveBeenCalledTimes(1);

        release({ local: true, cloud: true });
        await waitFor(() => expect(btn.disabled).toBe(false));
    });
});

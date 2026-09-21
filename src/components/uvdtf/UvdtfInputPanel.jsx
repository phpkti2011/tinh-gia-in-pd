// React 18+ auto JSX transform — không cần import React.
import NumberField from '../common/NumberField';

export default function UvdtfInputPanel({ config, params, onChange }) {
    return (
        <div id="uvdtf-controls">
            <div className="input-group">
                <h2 className="!text-base !mb-2">
                    <span className="text-blue-400">1.</span> Kích Thước Tem
                </h2>
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                        <label htmlFor="widthMM">Rộng W (mm)</label>
                        <div className="relative">
                            <NumberField
                                id="widthMM"
                                value={params.widthMM}
                                onCommit={(v) => onChange('widthMM', v)}
                                step={1}
                                min={1}
                            />
                            <span className="unit">mm</span>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="heightMM">Cao H (mm)</label>
                        <div className="relative">
                            <NumberField
                                id="heightMM"
                                value={params.heightMM}
                                onCommit={(v) => onChange('heightMM', v)}
                                step={1}
                                min={1}
                            />
                            <span className="unit">mm</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="input-group">
                <h2 className="!text-base !mb-2">
                    <span className="text-blue-400">2.</span> Số Lượng
                </h2>
                <div className="relative">
                    <NumberField
                        id="quantity"
                        value={params.quantity}
                        onCommit={(v) => onChange('quantity', v)}
                        step={1}
                        min={1}
                    />
                    <span className="unit">tem</span>
                </div>
            </div>

            <div className="input-group">
                <h2 className="!text-base !mb-2">
                    <span className="text-blue-400">3.</span> Bế Thành Phẩm
                </h2>
                <label htmlFor="dieCut">Kiểu bế</label>
                {/* Quy đổi ngay tại đây để params.dieCut LUÔN là boolean thật: nó chảy vào
                    engine, jobSpec và ternary ở panel kết quả — chuỗi 'no' là truthy nên
                    để nguyên chuỗi sẽ báo giá bế trong khi màn hình ghi "Không bế". */}
                <select
                    id="dieCut"
                    name="dieCut"
                    value={params.dieCut ? 'yes' : 'no'}
                    onChange={(e) => onChange('dieCut', e.target.value === 'yes')}
                >
                    <option value="no">Không bế</option>
                    <option value="yes">Có bế</option>
                </select>
            </div>

            {config && (
                <div className="input-group">
                    <p className="text-xs text-gray-400">
                        Khổ vật liệu: {config.materialWidthCM}cm · Vùng in:{' '}
                        {config.printableWidthCM}cm · Padding: {config.paddingCM * 10}mm
                    </p>
                </div>
            )}
        </div>
    );
}

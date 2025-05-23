const Textfield = ({
    name,
    error,
    onChange,
    onBlur,
    value,
    label,
    placeholder,
    type="text"
}) => {
    return (
        <div
            className="py-2"
        >
            { label &&
                <p className="text-[15px] text-slate-900">{label}</p>
            }
            <input
                name={name}
                value={value}
                type={type}
                onChange={onChange}
                placeholder={placeholder}
                className="border w-full focus:outline-none hover:border-2 hover:bg-slate-50 focus:bg-slate-50 text-[15px] p-2 h-[45px] rounded-md"
            />
            { error &&
                <p className="text-red-700 text-[15px]">{error}</p>
            }
        </div>
    );
};

export default Textfield;
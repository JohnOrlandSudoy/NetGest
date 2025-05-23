import { Icons } from "@/utils/icons";

const Icon = ({ name, className = "", rounded = false }) => {
    const getSVGByName = (name) => {
        const icon = Icons.find(icon => icon.name === name);
        return icon ? icon.svg : "";
    };

    return (
        <div 
            className={`${rounded ? "rounded-full p-[2px]" : ""} ${className} inline-flex items-center justify-center`} 
            dangerouslySetInnerHTML={{ __html: getSVGByName(name) }} 
        />
    );
};

export default Icon;

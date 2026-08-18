const Footer = () => {
    return (
        <div className="w-full bg-white dark:bg-card p-2 h-[50px] border-t border-gray-200/80 dark:border-border">
            <p className="text-center text-xs text-gray-600 dark:text-gray-400">
                This Solution has developed by{" "}
                <a
                    className="text-blue-700 dark:text-blue-400 font-semibold"
                    href="http://gbtsolutions.in/"
                    target="_blank"
                >
                    GBT Tech Solutions Private Limited
                </a>
                .
            </p>
            <p className="text-center text-xs text-gray-600 dark:text-gray-400">
                For any query please drop a mail to our software support team:
                <a
                    className="text-blue-700 dark:text-blue-400 font-semibold"
                    href="mailto:software.support@gbtsolutions.in"
                >
                    {" "}
                    software.support@gbtsolutions.in
                </a>
            </p>
        </div>
    );
};

export default Footer;

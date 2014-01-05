macro export {
    rule {
        {
            $($name (,) ...)
        };
    } => {
        global.NAMESPACE = {
            $($name: $name,)...
        };
    }
}

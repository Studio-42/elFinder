<?php
/**
 * Abstract class of editor plugins.
 *
 * @author Naoki Sawada
 */
class elFinderEditor
{
    /**
     * Array of allowed method by request from client side.
     *
     * @var array
     */
    protected $allowed = array();

    /**
     * Constructor.
     *
     * @param object $elfinder
     * @param array  $args
     */
    public function __construct($elfinder, $args)
    {
        $this->elfinder = $elfinder;
        $this->args = $args;
    }

    /**
     * Return boolean that this plugin is enabled.
     *
     * @return bool
     */
    public function enabled()
    {
        return true;
    }

    /**
     * Return boolean that $name method is allowed.
     *
     * @param string $name
     *
     * @return bool
     */
    public function isAllowedMethod($name)
    {
        $checker = array_flip($this->allowed);

        return isset($checker[$name]);
    }
}

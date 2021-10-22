#!/bin/sh

awk "/--- START_$1 ---/{flag=1;next}/--- END ---/{flag=0}flag" -
